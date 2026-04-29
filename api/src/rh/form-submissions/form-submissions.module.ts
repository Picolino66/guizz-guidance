import { Module } from "@nestjs/common"
import { PrismaModule } from "../../prisma/prisma.module"
import { RhAuthModule } from "../auth/rh-auth.module"
import { FormTemplatesModule } from "../form-templates/form-templates.module"
import { FormSubmissionsController } from "./form-submissions.controller"
import { FormSubmissionsService } from "./form-submissions.service"

@Module({
  imports: [PrismaModule, RhAuthModule, FormTemplatesModule],
  controllers: [FormSubmissionsController],
  providers: [FormSubmissionsService]
})
export class FormSubmissionsModule {}
