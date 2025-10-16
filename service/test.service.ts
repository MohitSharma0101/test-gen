import { api, ENDPOINT } from "@/lib/api"

function recheck(scheduleId: string) {
    return api.put(ENDPOINT.recheck, {
        scheduleId
    })
}

export const TestService = {
    recheck
}