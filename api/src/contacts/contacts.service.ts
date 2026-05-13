import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"
import { PrismaService } from "../prisma/prisma.service"
import { buildSearchText, normalizeSearchTextPart } from "../common/utils/search-text"
import { CreateContactDto } from "./dto/create-contact.dto"
import { ListContactsDto } from "./dto/list-contacts.dto"
import { UpdateContactDto } from "./dto/update-contact.dto"

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListContactsDto) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 10
    const search = this.normalizeOptionalString(query.search)
    const where = this.buildSearchWhere(search)
    const skip = (page - 1) * pageSize

    const [items, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        orderBy: [{ name: "asc" }, { email: "asc" }, { createdAt: "desc" }],
        skip,
        take: pageSize
      }),
      this.prisma.contact.count({ where })
    ])

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  }

  async create(dto: CreateContactDto) {
    const data = this.normalizeContactInput(dto)
    const existingByEmail = data.email
      ? await this.prisma.contact.findUnique({ where: { email: data.email } })
      : null
    const existingByPhone = data.phoneNumber
      ? await this.prisma.contact.findUnique({ where: { phoneNumber: data.phoneNumber } })
      : null

    if (existingByEmail && existingByPhone && existingByEmail.id !== existingByPhone.id) {
      throw new BadRequestException("Email e telefone já pertencem a contatos diferentes.")
    }

    const existingContact = existingByEmail ?? existingByPhone

    if (!existingContact) {
      return this.prisma.contact.create({ data })
    }

    return this.prisma.contact.update({
      where: { id: existingContact.id },
      data: {
        name: data.name ?? existingContact.name,
        company: data.company ?? existingContact.company,
        email: data.email ?? existingContact.email,
        phoneNumber: data.phoneNumber ?? existingContact.phoneNumber,
        searchText: this.buildContactSearchText({
          name: data.name ?? existingContact.name,
          company: data.company ?? existingContact.company,
          email: data.email ?? existingContact.email,
          phoneNumber: data.phoneNumber ?? existingContact.phoneNumber
        })
      }
    })
  }

  async update(id: string, dto: UpdateContactDto) {
    const current = await this.prisma.contact.findUnique({
      where: { id }
    })

    if (!current) {
      throw new NotFoundException("Contato não encontrado.")
    }

    const data = this.normalizeContactInput(dto)
    const existingByEmail = data.email
      ? await this.prisma.contact.findUnique({ where: { email: data.email } })
      : null
    const existingByPhone = data.phoneNumber
      ? await this.prisma.contact.findUnique({ where: { phoneNumber: data.phoneNumber } })
      : null

    if (existingByEmail && existingByEmail.id !== id) {
      throw new BadRequestException("Este e-mail já pertence a outro contato.")
    }

    if (existingByPhone && existingByPhone.id !== id) {
      throw new BadRequestException("Este telefone já pertence a outro contato.")
    }

    return this.prisma.contact.update({
      where: { id },
      data: {
        name: data.name,
        company: data.company,
        email: data.email,
        phoneNumber: data.phoneNumber,
        searchText: this.buildContactSearchText(data)
      }
    })
  }

  private normalizeContactInput(dto: CreateContactDto): Prisma.ContactUncheckedCreateInput {
    const name = this.normalizeOptionalString(dto.name)
    const company = this.normalizeOptionalString(dto.company)
    const email = this.normalizeOptionalEmail(dto.email)
    const phoneNumber = this.normalizeOptionalPhoneNumber(dto.phoneNumber)

    return {
      name,
      company,
      email,
      phoneNumber,
      searchText: this.buildContactSearchText({
        name,
        company,
        email,
        phoneNumber
      })
    }
  }

  private normalizeOptionalString(value?: string | null) {
    if (!value) {
      return null
    }

    const normalizedValue = value.trim()
    return normalizedValue === "" ? null : normalizedValue
  }

  private normalizeOptionalEmail(value?: string | null) {
    const normalizedValue = this.normalizeOptionalString(value)
    return normalizedValue ? normalizedValue.toLowerCase() : null
  }

  private normalizeOptionalPhoneNumber(value?: string | null) {
    const normalizedValue = this.normalizeOptionalString(value)

    if (!normalizedValue) {
      return null
    }

    const digits = normalizedValue.replace(/\D/g, "")
    const nationalNumber = digits.startsWith("55") ? digits.slice(2) : digits

    if (nationalNumber.length !== 10 && nationalNumber.length !== 11) {
      throw new BadRequestException("Telefone inválido. Informe DDD + número com 8 ou 9 dígitos.")
    }

    const ddd = nationalNumber.slice(0, 2)
    let localNumber = nationalNumber.slice(2)

    if (localNumber.length === 9) {
      if (!localNumber.startsWith("9")) {
        throw new BadRequestException("Telefone inválido. Quando houver 9 dígitos, o primeiro deve ser 9.")
      }

      localNumber = localNumber.slice(1)
    }

    if (localNumber.length !== 8) {
      throw new BadRequestException("Telefone inválido. O número final deve ter 8 dígitos após a normalização.")
    }

    return `55${ddd}${localNumber}`
  }

  private buildSearchWhere(search: string | null): Prisma.ContactWhereInput | undefined {
    if (!search) {
      return undefined
    }

    return {
      searchText: {
        contains: normalizeSearchTextPart(search)
      }
    }
  }

  private buildContactSearchText(input: {
    name?: string | null
    company?: string | null
    email?: string | null
    phoneNumber?: string | null
  }) {
    return buildSearchText([
      input.name,
      input.company,
      input.email,
      input.phoneNumber ? input.phoneNumber.replace(/\D/g, "") : null
    ])
  }
}
