import { create } from "zustand";
import { User } from "../hooks/use-auth";
import { createJSONStorage, persist } from "zustand/middleware";

type AuthStore = {
    user: User | null
    setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            user: null,
            setUser: (user) => set(() => ({ user }))
        }),
        {
            name: "bullz-user",
            storage: createJSONStorage(() => localStorage)
        }
    )
)