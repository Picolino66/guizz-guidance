import { Module } from "@nestjs/common"
import { PrismaModule } from "../../prisma/prisma.module"
import { RhAuthModule } from "../auth/rh-auth.module"
import { FormTemplatesController } from "./form-templates.controller"
import { FormTemplatesService } from "./form-templates.service"

@Module({
  imports: [PrismaModule, RhAuthModule],
  controllers: [FormTemplatesController],
  providers: [FormTemplatesService],
  exports: [FormTemplatesService]
})
export class FormTemplatesModule {}
