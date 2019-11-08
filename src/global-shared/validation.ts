import { Address, Name } from './types/server'

export function isValidName (name: Name): boolean {
  return name.firstName.length > 0 && name.lastName.length > 0
}

export function isDigits (digits: string): boolean {
  return /^\d+$/.test(digits)
}

export function isValidPhoneNumber (phone: string): boolean {
  return phone.length === 12 && phone.startsWith('+1') &&
    isDigits(phone.slice(1))
}

export function isValidSSN (ssn: string): boolean {
  const parts = ssn.split('-')
  if (parts.length !== 3) {
    return false
  }
  const [area, group, serial] = parts
  if (!isDigits(area) || !isDigits(group) || !isDigits(serial)) {
    return false
  }
  if (area.length !== 3 || group.length !== 2 || serial.length !== 4) {
    return false
  }
  return true
}

export function isValidBirthdate (birthdate: string): boolean {
  const parts = birthdate.split('-')
  if (parts.length !== 3) {
    return false
  }
  const [year, month, day] = parts

  if (!isDigits(year) || !isDigits(month) || !isDigits(day)) {
    return false
  }
  const oldestYear = 1850 // oldest birth year that Cognito allows
  const currentYear = (new Date()).getFullYear()
  if (parseInt(year, 10) < oldestYear || parseInt(year, 10) > currentYear) {
    return false
  }
  if (parseInt(month, 10) < 1 || parseInt(month, 10) > 12) {
    return false
  }
  if (parseInt(day, 10) < 1 || parseInt(day, 10) > 31) {
    return false
  }
  return true
}

export function isValidAddress (address: Address): boolean {
  if (address.street.length === 0 || address.city.length === 0 ||
    address.state.length === 0 || address.country.length === 0) {
    return false
  }
  if (!isDigits(address.postalCode) || address.postalCode.length !== 5) {
    return false
  }
  return true
}

export function isValidEmail (email: string): boolean {
  const parts = email.split('@')
  if (parts.length !== 2) {
    return false
  }
  if (parts[0].length === 0 || parts[1].length === 0) {
    return false
  }
  if (!parts[1].includes('.')) {
    return false
  }
  return true
}
