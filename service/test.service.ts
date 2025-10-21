import { api, ENDPOINT } from "@/lib/api"

function recheck(scheduleId: string) {
    return api.put(ENDPOINT.recheck, {
        scheduleId
    })
}

function deleteAnswerSheet(id: string) {
    return api.delete(ENDPOINT.answerSheets, {
        params: {
            id
        }
    })
}

export const TestService = {
    recheck,
    deleteAnswerSheet
}