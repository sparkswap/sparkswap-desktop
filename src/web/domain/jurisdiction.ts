import { getApprovedJurisdictions } from './server'
import { IP_API_URL } from '../../common/config'
import { delay } from '../../global-shared/util'

const FETCH_JURISDICTION_TIMEOUT = 5000

let approvedJurisdictions: string[] = []

async function updateApprovedJurisdictions (): Promise<void> {
  while (approvedJurisdictions.length === 0) {
    try {
      const { regions: jurisdictions } = await getApprovedJurisdictions()
      if (jurisdictions) {
        approvedJurisdictions = jurisdictions
      } else {
        throw new Error('No jurisdictions returned')
      }
    } catch (e) {
      console.error(`Failed to update approved jurisdictions: ${e.message}`)
      await delay(FETCH_JURISDICTION_TIMEOUT)
    }
  }
}

interface GetJurisdictionResponse {
  jurisdiction: string
}

function waitForJurisdiction (): Promise<GetJurisdictionResponse> {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('Timeout while waiting for jurisdiction')), FETCH_JURISDICTION_TIMEOUT)

    fetch(IP_API_URL)
      .then(res => res.json())
      .then(data => resolve({ jurisdiction: data.region } as unknown as GetJurisdictionResponse))
      .catch(err => reject(new Error(`Error while waiting for jurisdiction: ${err}`)))
  })
}

export async function getJurisdiction (): Promise<GetJurisdictionResponse | null> {
  try {
    const jurisdiction = await waitForJurisdiction()
    return jurisdiction
  } catch (e) {
    console.error(`Error while getting jurisdiction: ${e}`)
    return null
  }
}

export function isApprovedJurisdiction (jurisdiction: string): boolean {
  if (approvedJurisdictions.length === 0) {
    throw new Error('Jurisdiction list has not yet loaded. Please try again.')
  }
  return approvedJurisdictions.some(r => r.toLowerCase() === jurisdiction.toLowerCase())
}

// Update approved jurisdictions on load
updateApprovedJurisdictions()
