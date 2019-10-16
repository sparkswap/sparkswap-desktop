import React, { ReactNode } from 'react'
import { Classes, Colors, H1, H3 } from '@blueprintjs/core'
import { Line } from 'react-chartjs-2'
import { marketDataSubscriber, PricePoint } from '../domain/market-data'
import { formatPercent, formatDollarValue } from './formatters'
import './Prices.css'

const CURRENCY_NAME = 'Bitcoin'

const CHART_OPTIONS = {
  legend: {
    display: false
  },
  maintainAspectRatio: false,
  scales: {
    xAxes: [{
      type: 'time',
      time: { unit: 'month' },
      ticks: {
        autoSkip: true,
        maxTicksLimit: 12
      },
      gridLines: {
        display: false,
        drawborder: false,
        color: 'rgba(0, 0, 0, 0)'
      }
    }],
    yAxes: [{
      ticks: {
        beginAtZero: true,
        callback: (value: number) => formatDollarValue(value)
      },
      gridLines: {
        display: false,
        drawborder: false,
        color: 'rgba(0, 0, 0, 0)'
      }
    }]
  }
}

const DATA_OPTIONS = {
  label: `${CURRENCY_NAME} Price`,
  fill: false,
  lineTension: 0.1,
  backgroundColor: 'rgba(75,192,192,0.4)',
  borderCapStyle: 'butt',
  borderDash: [],
  borderDashOffset: 0.0,
  borderJoinStyle: 'miter',
  pointBorderColor: 'rgba(75,192,192,1)',
  pointBackgroundColor: '#fff',
  pointBorderWidth: 0,
  pointHoverRadius: 1,
  pointHoverBackgroundColor: 'rgba(75,192,192,1)',
  pointHoverBorderColor: 'rgba(220,220,220,1)',
  pointHoverBorderWidth: 1,
  pointRadius: 0,
  pointHitRadius: 1
}

const LOW_COLOR = '#4B8DAA'
const HIGH_COLOR = '#8DCD8F'

function createGradient (el: HTMLCanvasElement): CanvasGradient | null {
  const ctx = el.getContext('2d')
  if (!ctx) return null

  const gradientStroke = ctx.createLinearGradient(0, 100, 0, 300)
  gradientStroke.addColorStop(0, HIGH_COLOR)
  gradientStroke.addColorStop(1, LOW_COLOR)

  return gradientStroke
}

interface PriceChartState {
  historicalData: PricePoint[],
  currentPrice: number | null
}

class PriceChart extends React.Component<{}, PriceChartState> {
  constructor (props: {}) {
    super(props)
    this.state = {
      historicalData: marketDataSubscriber.historicalData,
      currentPrice: marketDataSubscriber.currentPrice
    }
  }

  componentWillUnmount (): void {
    marketDataSubscriber.removeListener('update', this.handleData)
  }

  componentDidMount (): void {
    marketDataSubscriber.on('update', this.handleData)
  }

  handleData = (): void => {
    const {
      currentPrice,
      historicalData
    } = marketDataSubscriber

    this.setState({
      currentPrice,
      historicalData
    })
  }

  get oldestClose (): number {
    if (!this.state.historicalData.length) {
      return 0
    }

    return this.state.historicalData[0].price
  }

  renderChart (historicalData: PricePoint[]): ReactNode {
    const labels: Date[] = []
    const data: number[] = []

    historicalData.forEach(({ date, price }) => {
      labels.push(date)
      data.push(price)
    })

    const chartData = (canvas: HTMLCanvasElement): object => {
      const datasets = [
        {
          ...DATA_OPTIONS,
          borderColor: createGradient(canvas) || LOW_COLOR,
          data
        }
      ]

      return { datasets, labels }
    }

    // although we should be able to use the `height` property, a bug in `react-chartjs-2` prevents it.
    // see: https://github.com/jerairrest/react-chartjs-2/issues/334
    return <div className='chart-wrapper'><Line data={chartData} options={CHART_OPTIONS} /></div>
  }

  getClassName = (): string => this.state.currentPrice !== null ? '' : Classes.SKELETON

  renderDelta (currentPrice: number | null, oldestClose: number): ReactNode {
    if (currentPrice === null) {
      // Used for sizing the skeleton outline while price is loading
      return (
        <H3 className='price-change'>
          <span className={this.getClassName()}>
            + $1,000.00 (10.00%)
          </span>
        </H3>
      )
    }

    const delta = (currentPrice - oldestClose)
    // Check if oldestClose is 0 to avoid divide by zero error while data is loading
    const percentGrowth = oldestClose === 0 ? 0 : (delta / oldestClose)
    const prefix = delta >= 0 ? '+ ' : '- '

    return (
      <H3 className='price-change' style={{ color: delta >= 0 ? Colors.GREEN4 : Colors.RED4 }}>
        <span className={this.getClassName()}>
          {prefix} {formatDollarValue(delta)} ({formatPercent(percentGrowth)})
        </span>
      </H3>
    )
  }

  renderPrice (): ReactNode {
    // Used for sizing the skeleton outline while price is loading
    const PLACEHOLDER_PRICE = 10000

    const renderedPrice = this.state.currentPrice !== null ? this.state.currentPrice : PLACEHOLDER_PRICE
    return <span className={this.getClassName()}>{formatDollarValue(renderedPrice)}</span>
  }

  render (): ReactNode {
    const {
      currentPrice,
      historicalData
    } = this.state
    const { oldestClose } = this

    return (
      <div className='PriceChart'>
        <H1 className='current-price'>
          {this.renderPrice()}
          <span className='subtitle'>{CURRENCY_NAME} Price</span>
        </H1>
        {this.renderDelta(currentPrice, oldestClose)}
        {this.renderChart(historicalData)}
      </div>
    )
  }
}

export default PriceChart
