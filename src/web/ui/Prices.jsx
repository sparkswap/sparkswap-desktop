import React from 'react'
import { Colors, H1, H3 } from '@blueprintjs/core'
import { Line } from 'react-chartjs-2'
import { marketDataSubscriber } from '../domain/market-data'
import { formatPercent, formatDollarValue } from './formatters'
import './Prices.css'

const CURRENCY_NAME = 'Bitcoin'

const CHART_OPTIONS = {
  legend: {
    display: false
  },
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
        callback: (value) => formatDollarValue(value)
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

function createGradient (el) {
  const ctx = el.getContext('2d')
  const gradientStroke = ctx.createLinearGradient(0, 100, 0, 300)
  gradientStroke.addColorStop(0, HIGH_COLOR)
  gradientStroke.addColorStop(1, LOW_COLOR)

  return gradientStroke
}

class PriceChart extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      historicalData: marketDataSubscriber.historicalData,
      currentPrice: marketDataSubscriber.currentPrice
    }
  }

  componentWillUnmount () {
    marketDataSubscriber.removeListener('update', this.handleData)
  }

  componentDidMount () {
    marketDataSubscriber.on('update', this.handleData)
  }

  handleData = () => {
    const {
      currentPrice,
      historicalData
    } = marketDataSubscriber

    this.setState({
      currentPrice,
      historicalData
    })
  }

  get oldestClose () {
    if (!this.state.historicalData.length) {
      return 0
    }

    return this.state.historicalData[0].price
  }

  renderChart (historicalData) {
    const labels = []
    const data = []

    historicalData.forEach(({ date, price }) => {
      labels.push(date)
      data.push(price)
    })

    const chartData = (canvas) => {
      const datasets = [
        {
          ...DATA_OPTIONS,
          borderColor: createGradient(canvas),
          data
        }
      ]

      return { datasets, labels }
    }

    return <Line data={chartData} options={CHART_OPTIONS} width={null} height={null} />
  }

  renderDelta (currentPrice, oldestClose) {
    const delta = (currentPrice - oldestClose)
    // Check if oldestClose is 0 to avoid divide by zero error while data is loading
    const percentGrowth = oldestClose === 0 ? 0 : (delta / oldestClose)
    const prefix = delta >= 0 ? '+ ' : '- '
    return (
      <H3 className='price-change' style={{ color: delta >= 0 ? Colors.GREEN4 : Colors.RED4 }}>
        {`${prefix} ${formatDollarValue(delta)} (${formatPercent(percentGrowth)})`}
      </H3>
    )
  }

  render () {
    const {
      currentPrice,
      historicalData
    } = this.state
    const { oldestClose } = this

    return (
      <div className='PriceChart'>
        <H1 className='current-price'>
          {formatDollarValue(currentPrice)}
          <span className='subtitle'>{CURRENCY_NAME} Price</span>
        </H1>
        {this.renderDelta(currentPrice, oldestClose)}
        {this.renderChart(historicalData)}
      </div>
    )
  }
}

export default PriceChart
