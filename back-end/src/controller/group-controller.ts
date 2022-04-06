import { getRepository } from "typeorm"
import { Request, Response } from "express"
import { CreateGroupInput, UpdateGroupInput } from "../interface/group.interface"
import { Roll } from "../entity/roll.entity"
import { Group } from "../entity/group.entity"
import { Student } from "../entity/student.entity"
import { GroupStudent } from "../entity/group-student.entity"
import { StudentRollState } from "../entity/student-roll-state.entity"
export class GroupController {
  private GroupRepository = getRepository(Group)
  private StudentRepository = getRepository(Student)
  private GroupStudentRepository = getRepository(GroupStudent)
  private StudentRollStateRepository = getRepository(StudentRollState)

  async allGroups(_request: Request, _response: Response) {
    try {
      return await this.GroupRepository.find()
    } catch (err) {
      console.log("ERROR =>", err?.message)
    }
  }

  async createGroup(request: Request, _response: Response) {
    try {
      const { body }: { body: any } = request

      const createGroupInput: CreateGroupInput = {
        name: body?.name,
        number_of_weeks: body?.number_of_weeks,
        roll_states: body?.roll_states,
        incidents: body?.incidents,
        ltmt: body?.ltmt,
        student_count: 0, // default value will be 0
      }

      const group = new Group()
      group.prepareToCreate(createGroupInput)
      return await this.GroupRepository.save(group)
    } catch (err) {
      console.log("ERROR =>", err?.message)
    }
  }

  async updateGroup(request: Request, _response: Response) {
    try {
      const { body }: { body: any } = request

      return await this.GroupRepository.findOne(request?.params?.id)
        .then((group) => {
          if (group) {
            const updateGroupInput: UpdateGroupInput = {
              name: body.name,
              number_of_weeks: body.number_of_weeks,
              roll_states: body.roll_states,
              incidents: body.incidents,
              ltmt: body.ltmt,
            }
            group?.prepareToUpdate(updateGroupInput)
            return this.GroupRepository.save(group)
          } else {
            throw new Error("No Group found with this id!")
          }
        })
        .catch((err) => {
          throw new Error(err?.message || "Something went wrong")
        })
    } catch (err) {
      console.log("ERROR =>", err?.message)
      return err?.message
    }
  }

  async removeGroup(request: Request, _response: Response) {
    try {
      let groupToRemove = await this.GroupRepository.findOne(request?.params?.id)
      if (groupToRemove) {
        return await this.GroupRepository.remove(groupToRemove)
      } else {
        throw new Error("Group Already deleted!")
      }
    } catch (err) {
      console.log("ERROR =>", err?.message)
      return `${err?.message}`
    }
  }

  async getGroupStudents(request: Request, _response: Response) {
    try {
      let students: any = await this.StudentRepository.createQueryBuilder("student")
        .innerJoin(GroupStudent, "group_student", "student.id = group_student.student_id")
        .where("group_student.group_id = :id", { id: request?.params?.groupId })
        .getMany()

      students = students.map((student: { id: any; first_name: any; last_name: any; photo_url: any }) => {
        return {
          id: student.id,
          full_name: `${student.first_name} ${student.last_name}`,
          photo_url: student.photo_url,
        }
      })
      return students
    } catch (err) {
      console.log("ERROR =>", err?.message)
      return err?.message
    }
  }

  async runGroupFilters(request: Request, response: Response) {
    try {
      // 1. Clear out the groups (delete all the students from the groups)
      return await this.GroupStudentRepository.createQueryBuilder()
        .delete()
        .execute()
        .then(async () => {
          // 2. For each group, query the student rolls to see which students match the filter for the group
          let groups = await this.GroupRepository.find() // fetch all groups
          groups.forEach(async (group) => {
            const { startDate, endDate } = this.getDates(group.number_of_weeks)
            const conditionStr = this.getConditionalString(group.roll_states)

            let result = await this.StudentRollStateRepository.createQueryBuilder("student_roll_state")
              .select("student_id")
              .addSelect("COUNT(student_roll_state.student_id) AS incident_count")
              .groupBy("student_roll_state.student_id")
              .innerJoin(Roll, "roll", "roll.id = student_roll_state.roll_id")
              .where("roll.completed_at BETWEEN :startDate AND :endDate", { startDate, endDate })
              .andWhere(conditionStr)
              .groupBy("student_roll_state.student_id")
              .having(`incident_count ${group.ltmt} :incidents`, { incidents: group.incidents })
              .execute()

            console.log("Filter Results => ", result)

            // 3. Add the list of students that match the filter to the group
            this.addGroupStudent(result, group.id)
            // updating the meta data fields in the group table for the current group. student count is length of the query result
            await this.GroupRepository.save({
              id: group.id,
              run_at: new Date(),
              student_count: result.length,
            })
          })
          return "Finished Successfully. Groups Updated!"
        })
    } catch (err) {
      console.log("ERROR =>", err?.message)
      return err?.message
    }
  }

  async addGroupStudent(result: any[], groupId: number) {
    result.forEach(async (student: any) => {
      const createGroupStudentInput: any = {
        student_id: student.student_id,
        group_id: groupId,
        incident_count: student.incident_count,
      }

      const groupStudent = new GroupStudent()
      groupStudent.prepareToCreate(createGroupStudentInput)
      await this.GroupStudentRepository.save(groupStudent)
    })
  }

  private getDates(number_of_weeks: number) {
    let endDate: any = new Date()
    let startDate: any = new Date()
    startDate.setDate(endDate.getDate() - 7 * number_of_weeks)
    startDate = startDate.toISOString()
    endDate = endDate.toISOString()
    return {
      startDate,
      endDate,
    }
  }

  private getConditionalString(rollStates: string) {
    const rollStatesArr = rollStates.split(",")
    let condtionalStr = ""
    rollStatesArr.forEach((state, index) => {
      condtionalStr += `student_roll_state.state = '${state}'`
      if (index < rollStatesArr.length - 1) {
        condtionalStr += " OR "
      }
    })
    return `(${condtionalStr})`
  }
}
