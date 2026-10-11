import { EventStatus } from "../../common/enums";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateEventDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  location!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  rundown?: unknown;
}
