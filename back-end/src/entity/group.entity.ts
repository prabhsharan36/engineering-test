import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from "typeorm"
import { CreateGroupInput, UpdateGroupInput } from "../interface/group.interface"
import { Student } from "./student.entity"

@Entity()
export class Group {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  number_of_weeks: number

  @Column()
  roll_states: string

  @Column()
  incidents: number

  @Column()
  ltmt: string

  @Column({
    nullable: true,
  })
  run_at: Date

  @Column()
  student_count: number

  @ManyToMany(() => Student, student => student.groups)
  @JoinTable()
  students: Student[]

  public prepareToCreate(input: CreateGroupInput) {
    this.name = input.name
    if (input.number_of_weeks !== undefined) this.number_of_weeks = input.number_of_weeks
    if (input.roll_states !== undefined) this.roll_states = input.roll_states
    if (input.incidents !== undefined) this.incidents = input.incidents
    if (input.ltmt !== undefined) this.ltmt = input.ltmt
    if (input.run_at !== undefined) this.run_at = input.run_at
    if (input.student_count !== undefined) this.student_count = input.student_count
  }

  public prepareToUpdate(input: UpdateGroupInput) {
    if (input.name !== undefined) this.name = input.name
    if (input.number_of_weeks !== undefined) this.number_of_weeks = input.number_of_weeks
  }
}
