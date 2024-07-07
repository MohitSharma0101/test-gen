

export function extractItemsArray(markdown: string) {
  const questions = [];
  const questionRegex = /(\d+)\.\s([\s\S]*?)(?=\d+\.\s|$)/g;

  let match;
  while ((match = questionRegex.exec(markdown)) !== null) {
    const questionText = match[2].trim();
    questions.push(questionText);
  }

  return questions;
}
