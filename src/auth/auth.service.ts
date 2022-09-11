import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { SignupDto } from "./dto/signup.dto";
import * as argon2 from "argon2";
import { LoginDto } from "./dto/login.dto";
import { User } from "./entities/user.entitiy";
import * as moment from "moment";

@Injectable()
export class AuthService {
  private users: User[] = [];

  constructor(private readonly jwtService: JwtService) {}

  async signup(newUser: SignupDto): Promise<any> {
    if (this.users.find((u) => u.username === newUser.username)) {
      throw new ConflictException(
        `User with username ${newUser.username} already exists}`
      );
    }
    const user = {
      username: newUser.username,
      password: await argon2.hash(newUser.password),
      firstName: newUser.firstName,
      lastName: newUser.lastName,
    };
    this.users.push(user);
    return this.createAccessToken(user.username);
  }

  findUser(username: string): User | undefined {
    return this.users.find((u) => u.username === username);
  }

  private createAccessToken(username: string) {
    const now = moment();
    const expireDate = now.clone().add("2", "minutes");

    const accessToken = this.jwtService.sign(
      { sub: username },
      { expiresIn: expireDate.diff(now) }
    );
    return { access_token: accessToken, expired_at: expireDate };
  }

  async login(user: LoginDto): Promise<any> {
    try {
      const existingUser = this.findUser(user.username);
      if (!user) throw new Error();

      const passwordMatch = await argon2.verify(
        existingUser.password,
        user.password
      );
      if (!passwordMatch) throw new Error();

      return this.createAccessToken(user.username);
    } catch (e) {
      throw new UnauthorizedException(
        "Username or password may be incorrect. Please try again"
      );
    }
  }
}
