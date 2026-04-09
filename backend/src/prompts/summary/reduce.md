{{#if isIntermediate}}
Consolidate these key points into the most important {{keyPoints}} points.

{{#if topicInstruction}}
{{topicInstruction}}
{{/if}}

Key Points:
{{keyPointsJson}}

Main Topics:
{{mainTopicsJson}}

Respond with ONLY valid JSON:
{"keyPoints": ["point 1", "point 2", ...], "mainTopics": ["topic 1", "topic 2", ...]}
{{else}}
You are an expert at creating clear, educational summaries.

Synthesize these key points into a {{lengthDescription}} (approximately {{lengthWords}} words).

{{#if topicInstruction}}
{{topicInstruction}}
{{/if}}

Key Points:
{{keyPointsJson}}

Main Topics:
{{mainTopicsJson}}

Guidelines:
- Create a coherent, flowing narrative
- Organize by main topics logically
- Use clear, accessible language
- Include all important concepts

Write the summary as flowing prose (not bullet points):
{{/if}}