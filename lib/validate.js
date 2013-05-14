var _ = require('lodash'),
    ucfirst = function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

/*jshint multistr: true */
var types = 'array boolean date element empty finite function null \
            number object plainObject regexp string'.match(/(\w+)/g),
    typeConstraints = {
        isWhole: function(value) {
            // a whole nunmber ( int )
            return _.isNumber(value) && value % 1 === 0;
        },
        isReal: function(value) {
            // a real number ( float )
            return _.isNumber(value) && !isNaN(value);
        },
        isNatural: function(value) {
            // e.g. positive int
            return typeConstraints.isWhole(value) && 0 <= value;
        }
    },
    _normalizeValidationSpec = function(validationSpec) {
        var normalized = {};

        _.keys(validationSpec).forEach(function(key) {
            normalized[key] = _.extend({
                optional: false,
                isa: null
            }, validationSpec[key]);
        });

        return normalized;
    },
    validationObject = function(invalidKeys, values, normalizedSpec) {
        return {
            isValid: function() {
                return invalidKeys.length === 0;
            },

            errors: function() {
                return invalidKeys;
            },

            get: function(name) {
                if (values) {
                    return values[name];
                }
                return null;
            },

            values: function() {
                if (_.isObject(values)) return _.values(values);
                if (_.isArray(values)) return values;

                return [];
            },

            errorString: function() {
                if (_.isObject(values)) {
                    return invalidKeys.map(function(key) {
                        if (_.isEmpty(values[key])) return 'Missing named argumnent ' + key;
                        return 'Named argument ' + key + ' is not a "' + normalizedSpec[key].isa + '"';
                    }).join(', ');
                }

                if (_.isArray(values)) {
                    return invalidKeys.map(function(index) {
                        if (_.isEmpty(values[index])) return 'Missing positional argument ' + index;
                        return 'Positional argument ' + index + ' is not a "' + normalizedSpec[index.isa] + '"';
                    }).join(', ');
                }

                return invalidKeys.shift();
            }
        };
    };

var Validate = {
    isValidOfType: function(value, typeName) {
        var method = 'is' + ucfirst(typeName);

        if (typeConstraints[method] !== undefined) return typeConstraints[method](value);
        if (types.indexOf(typeName) === -1) return false;

        return _[method](value);
    },

    isValid: function(value, rawSpec) {
        var spec = _.extend({
            optional: false,
            isa: null
        }, rawSpec);

        if (_.isUndefined(value) && !spec.optional) return false;
        if (_.isString(spec.isa)) return Validate.isValidOfType(value, spec.isa);

        return (value instanceof spec.isa);
    },

    validatePositional: function(posArguments, validationSpec) {
        var errors = [],
            normalized = _normalizeValidationSpec(validationSpec);

        if (_.isArray(posArguments) || _.isArguments(posArguments)) {
            var validation = validationSpec.map(function(validation, index) {
                return Validate.isValid(posArguments[index], validation) ? null : index;
            });

            errors = validation.filter(_.isNumber);
        } else {
            errors = ['positional arguments is not an array'];
            posArguments = null;
        }


        return validationObject(errors, posArguments, normalized);
    },

    validateObject: function(namedArguments, validationSpec) {
        var errors = [],
            normalized = _normalizeValidationSpec(validationSpec);

        if (_.isPlainObject(namedArguments)) {
            errors = _.keys(validationSpec).filter(function(key) {
                return Validate.isValid(namedArguments[key], validationSpec[key]) ? false : true;
            });
        } else {
            errors = ['named arguments is not an object'];
            namedArguments = null;
        }

        return validationObject(errors, namedArguments, normalized);
    }
};

module.exports = Validate;