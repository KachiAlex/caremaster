const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Validation schemas
const schemas = {
  register: Joi.object({
    matric_number: Joi.string().pattern(/^[A-Z]{2,3}\/\d{2}\/\d{4}$/).required()
      .messages({
        'string.pattern.base': 'Matric number must be in format: ABC/12/3456'
      }),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      }),
    first_name: Joi.string().min(2).max(50).required(),
    last_name: Joi.string().min(2).max(50).required(),
    department: Joi.string().min(2).max(100).required(),
    level: Joi.string().valid('100', '200', '300', '400', '500', '600').required(),
    session: Joi.string().pattern(/^\d{4}\/\d{4}$/).required()
      .messages({
        'string.pattern.base': 'Session must be in format: 2023/2024'
      })
  }),

  login: Joi.object({
    matric_number: Joi.string().required(),
    password: Joi.string().required()
  }),

  fundWallet: Joi.object({
    amount: Joi.number().positive().precision(2).required()
      .messages({
        'number.positive': 'Amount must be positive',
        'number.precision': 'Amount can have maximum 2 decimal places'
      }),
    description: Joi.string().max(200).optional()
  }),

  updateProfile: Joi.object({
    first_name: Joi.string().min(2).max(50).optional(),
    last_name: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
    department: Joi.string().min(2).max(100).optional(),
    level: Joi.string().valid('100', '200', '300', '400', '500', '600').optional(),
    session: Joi.string().pattern(/^\d{4}\/\d{4}$/).optional()
  }),

  changePassword: Joi.object({
    current_password: Joi.string().required(),
    new_password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
  }),

  adminReports: Joi.object({
    start_date: Joi.date().optional(),
    end_date: Joi.date().optional(),
    department: Joi.string().optional(),
    session: Joi.string().optional(),
    status: Joi.string().valid('pending', 'successful', 'failed', 'cancelled').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
};

module.exports = {
  validateRequest,
  schemas
};
