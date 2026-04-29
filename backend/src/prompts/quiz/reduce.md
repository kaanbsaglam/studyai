You are curating quiz questions for quality and variety.

From these {{totalCount}} candidate questions, select the best {{targetCount}} questions.

{{#if topicInstruction}}
{{topicInstruction}}
{{/if}}

Selection criteria:
- Remove duplicate or very similar questions
- Ensure topic variety
- Prefer clearer, more educational questions
- Ensure answers are accurate

Candidate questions:
{{candidates}}

Respond with ONLY a valid JSON object containing up to {{targetCount}} questions:
{"questions": [{"question": "...", "correctAnswer": "...", "wrongAnswers": ["...", "...", "..."]}]}