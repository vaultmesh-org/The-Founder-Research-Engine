/**
 * Schema validation using Ajv
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Import schemas
import packSchema from '../../schemas/pack.schema.json';
import sourceSchema from '../../schemas/source.schema.json';
import runSchema from '../../schemas/run.schema.json';
import artifactSchema from '../../schemas/artifact.schema.json';
import hashesSchema from '../../schemas/hashes.schema.json';

// Create validator instance
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Compile schemas
const validators = {
  pack: ajv.compile(packSchema),
  source: ajv.compile(sourceSchema),
  run: ajv.compile(runSchema),
  artifact: ajv.compile(artifactSchema),
  hashes: ajv.compile(hashesSchema)
};

/**
 * Validate object against schema
 */
export function validate(type, data) {
  const validator = validators[type];

  if (!validator) {
    return {
      valid: false,
      errors: [`Unknown schema type: ${type}`]
    };
  }

  const valid = validator(data);

  return {
    valid,
    errors: valid ? [] : (validator.errors || []).map(formatError)
  };
}

/**
 * Format Ajv error for display
 */
function formatError(error) {
  const path = error.instancePath || '/';
  const message = error.message || 'Unknown error';

  if (error.keyword === 'required') {
    return `Missing required field: ${error.params.missingProperty}`;
  }

  if (error.keyword === 'enum') {
    return `${path}: must be one of ${error.params.allowedValues.join(', ')}`;
  }

  return `${path}: ${message}`;
}

/**
 * Validate and log errors
 */
export function validateOrThrow(type, data) {
  const result = validate(type, data);

  if (!result.valid) {
    console.error(`Validation failed for ${type}:`, result.errors);
    throw new Error(`Invalid ${type}: ${result.errors.join('; ')}`);
  }

  return true;
}

/**
 * Validate with warning (doesn't throw)
 */
export function validateOrWarn(type, data) {
  const result = validate(type, data);

  if (!result.valid) {
    console.warn(`Validation warning for ${type}:`, result.errors);
  }

  return result;
}
