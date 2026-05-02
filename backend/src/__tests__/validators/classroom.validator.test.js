/**
 * Classroom Validators tests.
 */

const {
  createClassroomSchema,
  updateClassroomSchema,
} = require('../../validators/classroom.validator');

describe('classroom.validator', () => {
  describe('createClassroomSchema', () => {
    it('accepts a valid name', () => {
      const data = createClassroomSchema.parse({ name: 'Math 101' });
      expect(data.name).toBe('Math 101');
    });

    it('trims whitespace from name and description', () => {
      const data = createClassroomSchema.parse({
        name: '  Math  ',
        description: '  Hello  ',
      });
      expect(data.name).toBe('Math');
      expect(data.description).toBe('Hello');
    });

    it('rejects missing name', () => {
      expect(() => createClassroomSchema.parse({})).toThrow();
    });

    it('rejects empty name', () => {
      expect(() => createClassroomSchema.parse({ name: '' })).toThrow();
    });

    it('rejects name longer than 100 chars', () => {
      expect(() => createClassroomSchema.parse({ name: 'x'.repeat(101) })).toThrow();
    });

    it('accepts name exactly 100 chars (boundary)', () => {
      expect(() => createClassroomSchema.parse({ name: 'x'.repeat(100) })).not.toThrow();
    });

    it('rejects description longer than 500 chars', () => {
      expect(() => createClassroomSchema.parse({
        name: 'ok',
        description: 'x'.repeat(501),
      })).toThrow();
    });

    it('description is optional', () => {
      const data = createClassroomSchema.parse({ name: 'ok' });
      expect(data.description).toBeUndefined();
    });
  });

  describe('updateClassroomSchema', () => {
    it('accepts empty object (all fields optional)', () => {
      expect(() => updateClassroomSchema.parse({})).not.toThrow();
    });

    it('accepts null description (clear it)', () => {
      const data = updateClassroomSchema.parse({ description: null });
      expect(data.description).toBeNull();
    });

    it('rejects empty name string', () => {
      expect(() => updateClassroomSchema.parse({ name: '' })).toThrow();
    });

    it('rejects name longer than 100 chars', () => {
      expect(() => updateClassroomSchema.parse({ name: 'x'.repeat(101) })).toThrow();
    });
  });
});
