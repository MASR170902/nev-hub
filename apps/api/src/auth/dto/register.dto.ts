import { IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsString({ message: "Nama lengkap wajib diisi." })
  @MinLength(2, { message: "Nama minimal 2 karakter." })
  name!: string;

  @IsString({ message: "Email atau NIM wajib diisi." })
  @MinLength(3, { message: "Email atau NIM minimal 3 karakter." })
  email!: string;

  @IsString({ message: "Password wajib diisi." })
  @MinLength(6, { message: "Password minimal 6 karakter." })
  password!: string;
}

