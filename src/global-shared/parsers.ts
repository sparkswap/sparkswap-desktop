export function parsePhoneNumber (phone: string): string {
  const digits = phone.split('-').join('').split(' ').join('')
  return digits.startsWith('+') ? digits : '+1' + digits
}

export function parseSSN (ssn: string): string {
  const digits = ssn.split('-').join('').split(' ').join('')
  return [digits.slice(0, 3), digits.slice(3, 5), digits.slice(5)].join('-')
}
