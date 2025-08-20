export class JwtUserPayload {
  sub: number; // User ID
  email: string;
  roles: string[];

  constructor(sub: number, email: string, roles: string[]) {
    this.sub = sub;
    this.email = email;
    this.roles = roles;
  }
}
