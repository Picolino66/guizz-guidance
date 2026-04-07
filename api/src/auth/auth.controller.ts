import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AdminAuthGuard } from "../common/guards/admin-auth.guard";
import { AuthUser } from "../common/types/auth-user.type";
import { AuthService } from "./auth.service";
import { ChangeAdminPasswordDto } from "./dto/change-admin-password.dto";
import { LoginAdminDto } from "./dto/login-admin.dto";
import { LoginParticipantDto } from "./dto/login-participant.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login-participant")
  loginParticipant(@Body() dto: LoginParticipantDto) {
    return this.authService.loginParticipant(dto);
  }

  @Post("login-admin")
  loginAdmin(@Body() dto: LoginAdminDto) {
    return this.authService.loginAdmin(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Post("change-admin-password")
  changeAdminPassword(@CurrentUser() user: AuthUser, @Body() dto: ChangeAdminPasswordDto) {
    return this.authService.changeAdminPassword(user, dto);
  }
}
