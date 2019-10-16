import { getApprovedLocations } from './server'
import { IP_API_URL } from '../../common/config'

const FETCH_LOCATION_TIMEOUT = 5000

let approvedRegions: string[]

async function updateApprovedLocations (): Promise<void> {
  try {
    const { regions } = await getApprovedLocations()
    approvedRegions = regions
  } catch (e) {
    console.error('Failed to update approved locations')
  }
}

interface GetLocationResponse {
  region: string
}

async function waitForLocation (): Promise<GetLocationResponse> {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('Timeout while waiting for location')), FETCH_LOCATION_TIMEOUT)

    fetch(IP_API_URL)
      .then(res => res.json())
      .then(location => resolve(location as unknown as GetLocationResponse))
      .catch(err => reject(new Error(`Error while waiting for location: ${err}`)))
  })
}

export async function getLocation (): Promise<GetLocationResponse | null> {
  try {
    const location = await waitForLocation()
    return location
  } catch (e) {
    console.error(`Error while getting location: ${e}`)
    return null
  }
}

export function isApprovedLocation (region: string): boolean {
  return approvedRegions.some(r => r.toLowerCase() === region.toLowerCase())
}

// Update the approved locations on load
updateApprovedLocations()
