import axios from "axios"

export const ENDPOINT = {
    bulkQuestion: 'bulk/question',
    questions: 'question',
    chapters: 'chapter',
    books: 'books', 
    papers: 'papers',
    questionsUsed: 'questions/used'
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH

export const api = axios.create({
    baseURL: BASE_PATH
});

