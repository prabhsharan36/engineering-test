import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from "typeorm"
import { CreateRollInput, UpdateRollInput } from "../interface/roll.interface"
import { Student } from "./student.entity"

@Entity()
export class Roll {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  completed_at: Date

  @ManyToMany(() => Student, student => student.rolls)
  students: Student[];

  public prepareToCreate(input: CreateRollInput) {
    this.name = input.name
    if (input.completed_at !== undefined) this.completed_at = input.completed_at
  }

  public prepareToUpdate(input: UpdateRollInput) {
    if (input.name !== undefined) this.name = input.name
    if (input.completed_at !== undefined) this.completed_at = input.completed_at
  }
}
