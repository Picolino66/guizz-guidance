import { Type } from "class-transformer"
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator"
import { WhatsappDispatchStatus } from "@prisma/client"

export class ListWhatsappLogsDto {
  @IsOptional()
  @IsEnum(WhatsappDispatchStatus)
  status?: WhatsappDispatchStatus

  @IsOptional()
  @IsString()
  automationId?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}
