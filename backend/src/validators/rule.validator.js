const { z } = require('zod');

exports.createRuleConfigSchema = z.object({
  body: z.object({
    version: z.string().min(1, 'Version is required'),
    rules: z.any() // JSON blob, any valid JSON
  })
});
