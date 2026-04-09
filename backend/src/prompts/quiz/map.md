{{#if isIntermediate}}
Extract key testable facts from this content and generate up to {{count}} multiple-choice questions.

{{topicInstruction}}

Content:
{{content}}

Requirements:
- Each question should test understanding of the material
- Include one correct answer and three plausible wrong answers
- Questions should be clear and unambiguous
- If the content has no testable information, return an empty array []

Respond with ONLY a valid JSON array (can be empty if no questions possible):
[{"question": "...", "correctAnswer": "...", "wrongAnswers": ["...", "...", "..."]}]
{{else}}
You are a quiz creator that makes effective multiple-choice questions for learning.

Based on the following study material, create up to {{count}} multiple-choice quiz questions.
{{topicInstruction}}

Guidelines:
- Each question should test understanding of the material
- Questions should be clear and unambiguous
- The correct answer should be based on the provided content
- Wrong answers (distractors) should be plausible but clearly incorrect
- Vary the difficulty from easy to challenging
- If the content has no testable information, return an empty array []

Study Material:
{{content}}

Respond with ONLY a valid JSON array in this exact format, no other text:
[{"question": "What is...?", "correctAnswer": "The correct answer", "wrongAnswers": ["Wrong answer 1", "Wrong answer 2", "Wrong answer 3"]}]
{{/if}}