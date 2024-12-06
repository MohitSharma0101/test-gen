
export const getQuestions = () => {
    return new Array(75).fill(0).map((m, i) => {
        return {
            text: "some ques desc",
            index: i + 1,
            selectedAns: -1,
            markedForReview: false,
            visited: false,
        }
    })
}