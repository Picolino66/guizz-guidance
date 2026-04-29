import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards
} from "@nestjs/common";
import { AdminAuthGuard } from "../common/guards/admin-auth.guard";
import { CreateAllowedEmailDto } from "./dto/create-allowed-email.dto";
import { CreateAlternativeDto } from "./dto/create-alternative.dto";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { CreateQuizDto } from "./dto/create-quiz.dto";
import { SetQuizAllowedEmailsDto } from "./dto/set-quiz-allowed-emails.dto";
import { AdminService } from "./admin.service";

@UseGuards(AdminAuthGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("quizzes")
  listQuizzes() {
    return this.adminService.listQuizzes();
  }

  @Post("quizzes")
  createQuiz(@Body() dto: CreateQuizDto) {
    return this.adminService.createQuiz(dto);
  }

  @Post("quizzes/:quizId/force-start")
  forceStartQuiz(@Param("quizId") quizId: string) {
    return this.adminService.forceStartQuiz(quizId);
  }

  @Post("quizzes/:quizId/finish")
  finishQuiz(@Param("quizId") quizId: string) {
    return this.adminService.finishQuiz(quizId);
  }

  @Post("quizzes/:quizId/questions")
  addQuestion(@Param("quizId") quizId: string, @Body() dto: CreateQuestionDto) {
    return this.adminService.addQuestion(quizId, dto);
  }

  @Post("quizzes/:quizId/allowed-emails")
  setQuizAllowedEmails(
    @Param("quizId") quizId: string,
    @Body() dto: SetQuizAllowedEmailsDto
  ) {
    return this.adminService.setQuizAllowedEmails(quizId, dto);
  }

  @Post("questions/:questionId/alternatives")
  addAlternative(
    @Param("questionId") questionId: string,
    @Body() dto: CreateAlternativeDto
  ) {
    return this.adminService.addAlternative(questionId, dto);
  }

  @Post("allowed-emails")
  addAllowedEmail(@Body() dto: CreateAllowedEmailDto) {
    return this.adminService.addAllowedEmail(dto);
  }

  @Get("allowed-emails")
  listAllowedEmails() {
    return this.adminService.listAllowedEmails();
  }

  @Delete("allowed-emails/:allowedEmailId")
  removeAllowedEmail(@Param("allowedEmailId") allowedEmailId: string) {
    return this.adminService.removeAllowedEmail(allowedEmailId);
  }

  @Get("dashboard/:quizId")
  getDashboard(@Param("quizId") quizId: string) {
    return this.adminService.getDashboard(quizId);
  }
}
