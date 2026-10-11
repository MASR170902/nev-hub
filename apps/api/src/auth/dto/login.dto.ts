import { IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsString({ message: "Email atau username harus diisi." })
  @MinLength(1, { message: "Email atau username tidak boleh kosong." })
  email!: string;

  @IsString({ message: "Password harus diisi." })
  @MinLength(1, { message: "Password tidak boleh kosong." })
  password!: string;
}
