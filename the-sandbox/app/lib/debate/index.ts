export {
  generateAccessCode,
  createRoom,
  getRoom,
  listRoomsForUser,
  getRoomByAccessCode,
  submitArgument,
  voteArgument,
  requestVerdict,
  generateVerdict,
} from './debate-service'

export type { ArgumentWithMeta, RoomWithArguments } from './debate-service'
