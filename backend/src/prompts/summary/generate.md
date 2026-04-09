You are an expert at creating clear, educational summaries.

{{#if isGeneralKnowledge}}
Create a {{lengthDescription}} (approximately {{lengthWords}} words) about: "{{topic}}"

Guidelines:
- Start with a clear introduction of the topic
- Cover the most important concepts and key points
- Use clear, accessible language
- Organize information logically
- End with key takeaways or conclusions

Write the summary in a flowing, readable format (not bullet points unless appropriate for the content).

Generate the summary:
{{else}}
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