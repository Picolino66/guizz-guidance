import { Module } from "@nestjs/common"
import { RhAuthModule } from "./auth/rh-auth.module"
import { RhUsersModule } from "./users/rh-users.module"
import { CandidatesModule } from "./candidates/candidates.module"
import { JobsModule } from "./jobs/jobs.module"
import { InterviewsModule } from "./interviews/interviews.module"
import { FormTemplatesModule } from "./form-templates/form-templates.module"
import { FormSubmissionsModule } from "./form-submissions/form-submissions.module"

@Module({
  imports: [
    RhAuthModule,
    RhUsersModule,
    CandidatesModule,
    JobsModule,
    InterviewsModule,
    FormTemplatesModule,
    FormSubmissionsModule
  ]
})
export class RhModule {}
