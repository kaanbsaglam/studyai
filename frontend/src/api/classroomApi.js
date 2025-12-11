import api from "./axiosClient";

export function getClassrooms() {
  return api.get("/classrooms");
}

export function createClassroom(name) {
  return api.post("/classrooms", { name });
}
