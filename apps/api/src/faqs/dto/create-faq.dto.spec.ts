import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateFaqDto } from './create-faq.dto';
import { UpdateFaqDto } from './update-faq.dto';

describe('CreateFaqDto', () => {
  it('accepts a valid Prep Year FAQ', async () => {
    const dto = plainToInstance(CreateFaqDto, {
      audience: 'prep_year',
      category: ' Documents ',
      question: '  Which documents do I upload?  ',
      answer: '  Use My Documents.  ',
      sortOrder: '2',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.category).toBe('Documents');
    expect(dto.question).toBe('Which documents do I upload?');
    expect(dto.answer).toBe('Use My Documents.');
    expect(dto.sortOrder).toBe(2);
  });

  it('rejects an unknown audience', async () => {
    const dto = plainToInstance(CreateFaqDto, {
      audience: 'alumni',
      question: 'Who do I contact?',
      answer: 'Your coordinator.',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'audience')).toBe(true);
  });

  it('rejects a blank question', async () => {
    const dto = plainToInstance(CreateFaqDto, {
      audience: 'scholar',
      question: '   ',
      answer: 'Your coordinator can help.',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'question')).toBe(true);
  });
});

describe('UpdateFaqDto', () => {
  it('clears a category when the field is blank', async () => {
    const dto = plainToInstance(UpdateFaqDto, { category: '   ' });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.category).toBeNull();
  });

  it('keeps an explicit null category', async () => {
    const dto = plainToInstance(UpdateFaqDto, { category: null });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.category).toBeNull();
  });
});
