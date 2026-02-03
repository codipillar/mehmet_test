import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class StartBuildDto {
  @IsString()
  userId: string;

  @IsString()
  buildType: string;

  @IsNumber()
  @Min(1)
  duration: number; // Duration in milliseconds

  @IsOptional()
  @IsNumber()
  @Min(0)
  woodCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  clayCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ironCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cropCost?: number;
}
