import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from './user-role.entity';
import { UserRoles } from 'src/common/enum/user-role.enum';

@Entity('role')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: UserRoles })
  role_name: UserRoles;

  @OneToMany(() => UserRole, (ur) => ur.role)
  userRoles: UserRole[];
}
