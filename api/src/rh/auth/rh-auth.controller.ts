import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common"
import { IsEmail, IsString, MinLength } from "class-validator"
import { RhAuthService } from "./rh-auth.service"

class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(6)
  password!: string
}

@Controller("rh/auth")
export class RhAuthController {
  constructor(private readonly rhAuthService: RhAuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.rhAuthService.login(dto.email, dto.password)
  }
}
