{{#if isIntermediate}}
Extract the key points and main topics from this content.

{{topicInstruction}}

Content:
{{content}}

Extract up to {{keyPoints}} key points as a JSON object:
{"keyPoints": ["point 1", "point 2", ...], "mainTopics": ["topic 1", "topic 2", ...]}

Respond with ONLY valid JSON:
{{else}}
You are an expert at creating clear, educational summaries.

Based on the following study material, create a {{lengthDescription}} (approximately {{lengthWords}} words).
{{topicInstruction}}

Guidelines:
- Capture the main ideas and key concepts
- Maintain accuracy to the source material
- Use clear, accessible language
- Organize information logically
- Include important details, examples, or definitions when relevant

Study Material:
{{content}}

Write the summary in a flowing, readable format. Generate the summary:
{{/if}}