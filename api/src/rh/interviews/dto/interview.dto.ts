import { IsArray, IsDateString, IsEnum, IsOptional, IsString, ValidateNested } from "class-validator"
import { Type } from "class-transformer"

export enum InterviewDecisionEnum {
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  HOLD = "HOLD"
}

export class SlotInputDto {
  @IsDateString()
  startAt!: string

  @IsOptional()
  @IsDateString()
  endAt?: string
}

export class CreateInterviewDto {
  @IsString()
  candidateId!: string

  @IsString()
  jobPositionId!: string

  @IsOptional()
  @IsString()
  templateId?: string
}

export class UpdateInterviewDto {
  @IsOptional()
  @IsString()
  candidateId?: string

  @IsOptional()
  @IsString()
  jobPositionId?: string

  @IsOptional()
  @IsString()
  templateId?: string
}

export class AssignInterviewDto {
  @IsArray()
  @IsString({ each: true })
  userIds!: string[]
}

export class SuggestSlotsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotInputDto)
  slots!: SlotInputDto[]
}

export class ConfirmSlotDto {
  @IsString()
  slotId!: string
}

export class CounterSlotsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotInputDto)
  slots!: SlotInputDto[]
}

export class MarkDoneDto {
  @IsOptional()
  @IsString()
  note?: string
}

export class CloseInterviewDto {
  @IsEnum(InterviewDecisionEnum)
  decision!: InterviewDecisionEnum

  @IsOptional()
  @IsString()
  note?: string
}

export class FilterInterviewsDto {
  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  jobPositionId?: string

  @IsOptional()
  @IsString()
  assigneeId?: string
}
