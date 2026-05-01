import { Type } from "class-transformer"
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min
} from "class-validator"
import { WhatsappAutomationKind, WhatsappAutomationStatus } from "@prisma/client"

export class UpdateWhatsappAutomationDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  message?: string

  @IsOptional()
  @IsEnum(WhatsappAutomationKind)
  kind?: WhatsappAutomationKind

  @IsOptional()
  @IsEnum(WhatsappAutomationStatus)
  status?: WhatsappAutomationStatus

  @IsOptional()
  @IsString()
  targetGroupJid?: string

  @IsOptional()
  @IsDateString()
  scheduledFor?: string

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  timeOfDay?: string

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[]

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number

  @IsOptional()
  @Matches(/^\d{2}-\d{2}$/)
  monthDay?: string

  @IsOptional()
  @IsString()
  recurrenceTimeZone?: string
}
