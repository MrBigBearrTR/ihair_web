import { api } from "@/api/client";
import type {
  RegisterRequest,
  User,
  UserSalonAssignmentRequest,
} from "@/types/domain";

export async function listUsers() {
  const { data } = await api.get<User[]>("/api/users");
  return data;
}

export async function createUser(body: RegisterRequest) {
  await api.post("/api/auth/register", body);
}

export async function updateUserSalons(
  userId: number,
  body: UserSalonAssignmentRequest,
) {
  const { data } = await api.put<User>(`/api/users/${userId}/salons`, body);
  return data;
}
