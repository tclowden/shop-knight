export const PRICING_FORMULA_OPTIONS = [
  { value: 'AREA', label: 'Area' },
  { value: 'CYL_VOL', label: 'Cyl Vol' },
  { value: 'CYLINDRICAL_SURFACE_AREA', label: 'Cylindrical Surface Area' },
  { value: 'FIXED', label: 'Fixed' },
  { value: 'HEIGHT', label: 'Height' },
  { value: 'LENGTH', label: 'Length' },
  { value: 'NORECALC', label: 'NoRecalc' },
  { value: 'NONE', label: 'None' },
  { value: 'PBASE', label: 'PBase' },
  { value: 'PERMITER', label: 'Permiter' },
  { value: 'TOTAL_AREA', label: 'Total Area' },
  { value: 'UNIT', label: 'Unit' },
  { value: 'VOLUME', label: 'Volume' },
  { value: 'WIDTH', label: 'Width' },
] as const;

export const PRICING_RATE_UNIT_OPTIONS = [
  { value: 'CU_IN', label: 'CuIn' },
  { value: 'CU_FT', label: 'Cuft' },
  { value: 'FEET', label: 'Feet' },
  { value: 'INCHES', label: 'Inches' },
  { value: 'SQ_IN', label: 'SqIn' },
  { value: 'SQ_FT', label: 'Sqft' },
  { value: 'UNIT', label: 'Unit' },
] as const;

export const PRICING_RATE_PER_OPTIONS = [
  { value: 'HR', label: 'Hr' },
  { value: 'MIN', label: 'Min' },
  { value: 'UNIT', label: 'Unit' },
] as const;

export const MODIFIER_TYPE_OPTIONS = [
  { value: 'BOOLEAN', label: 'Boolean' },
  { value: 'NUMERIC', label: 'Numeric' },
  { value: 'RANGE', label: 'Range' },
] as const;

export const MODIFIER_UNIT_OPTIONS = [
  { value: 'PERCENT', label: '%' },
  { value: 'CU_FT', label: 'Cuft' },
  { value: 'DAYS', label: 'Days' },
  { value: 'FEET', label: 'Feet' },
  { value: 'HOUR', label: 'Hour' },
  { value: 'INCHES', label: 'Inches' },
  { value: 'KM', label: 'KM' },
  { value: 'METERS', label: 'Meters' },
  { value: 'MILES', label: 'Miles' },
  { value: 'SQ_FT', label: 'Sqft' },
  { value: 'SQ_M', label: 'Sqm' },
  { value: 'UNIT', label: 'Unit' },
  { value: 'YARD', label: 'Yard' },
  { value: 'CM', label: 'cm' },
  { value: 'MM', label: 'mm' },
] as const;

export const MATERIAL_UNIT_OPTIONS = [
  { value: 'BAG', label: 'Bag' },
  { value: 'BDFT', label: 'BdFt' },
  { value: 'BOX', label: 'Box' },
  { value: 'CASE', label: 'Case' },
  { value: 'CUIN', label: 'CuIn' },
  { value: 'CUFT', label: 'Cuft' },
  { value: 'FEET', label: 'Feet' },
  { value: 'GALLON', label: 'Gallon' },
  { value: 'INCH', label: 'Inch' },
  { value: 'L', label: 'L' },
  { value: 'LB', label: 'lb' },
  { value: 'ML', label: 'ML' },
  { value: 'OZ', label: 'Oz' },
  { value: 'PALLET', label: 'Pallet' },
  { value: 'REAM', label: 'Ream' },
  { value: 'ROLL', label: 'Roll' },
  { value: 'SETS', label: 'Set(s)' },
  { value: 'SHEET', label: 'Sheet' },
  { value: 'SQIN', label: 'SqIn' },
  { value: 'SQYD', label: 'SqYd' },
  { value: 'SQFT', label: 'Sqft' },
  { value: 'UNIT', label: 'Unit' },
  { value: 'YARD', label: 'Yard' },
] as const;

export const MATERIAL_WEIGHT_UOM_OPTIONS = [
  { value: 'KG', label: 'Kg' },
  { value: 'LB', label: 'Lb' },
  { value: 'OZ', label: 'Oz' },
] as const;

export const MATERIAL_FORMULA_OPTIONS = [
  { value: 'AREA', label: 'Area' },
  { value: 'CYL_VOL', label: 'Cyl.Vol' },
  { value: 'CYLINDRICAL_SURFACE_AREA', label: 'Cylindrical Surface Area' },
  { value: 'FIXED', label: 'Fixed' },
  { value: 'HEIGHT', label: 'Height' },
  { value: 'LENGTH', label: 'Length' },
  { value: 'NORECALC', label: 'NoRecalc' },
  { value: 'NONE', label: 'None' },
  { value: 'PBASE', label: 'PBase' },
  { value: 'PERIMETER', label: 'Perimeter' },
  { value: 'TOTAL_AREA', label: 'Total Area' },
  { value: 'UNIT', label: 'Unit' },
  { value: 'VOLUME', label: 'Volume' },
  { value: 'WIDTH', label: 'Width' },
] as const;

export const MATERIAL_FIXED_SIDE_OPTIONS = [
  { value: 'BOTH', label: 'Both' },
  { value: 'HEIGHT', label: 'Height' },
  { value: 'WIDTH', label: 'Width' },
] as const;

export const MATERIAL_QB_ITEM_TYPE_OPTIONS = [
  { value: 'INVENTORY', label: 'Inventory' },
  { value: 'NON_INVENTORY', label: 'Non Inventory' },
  { value: 'SERVICE', label: 'Service' },
] as const;

export function labelFromOption(options: readonly { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}
