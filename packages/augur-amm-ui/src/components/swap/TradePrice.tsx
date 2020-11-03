import React, { useMemo, useState } from 'react'
import { TokenAmount } from '@uniswap/sdk'
import { useContext } from 'react'
import { Repeat } from 'react-feather'
import { Text } from 'rebass'
import { ThemeContext } from 'styled-components'
import { StyledBalanceMaxMini } from './styleds'
import { TradeInfo } from '../../hooks/Trades'
import { formattedNum } from '../../utils'

interface TradePriceProps {
  trade?: TradeInfo
  estTokenAmount?: TokenAmount
}

export default function TradePrice({ trade, estTokenAmount }: TradePriceProps) {
  const theme = useContext(ThemeContext)

  const [priceRate, setPriceRate] = useState(null)
  const [showInverted, setShowInverted] = useState(false)

  useMemo(() => {
    if (!estTokenAmount) return setPriceRate(null)
    console.log('trade price estTokenAmount', String(estTokenAmount.raw))
    const receivedAmountDisplay = trade.inputAmount.divide(estTokenAmount)
    const InPerOut = receivedAmountDisplay
    const OutPerIn = estTokenAmount.divide(trade.inputAmount)
    const label = showInverted
      ? `${formattedNum(InPerOut.toSignificant(6))} ${trade.currencyOut.symbol} per ${trade.currencyIn.symbol}`
      : `${formattedNum(OutPerIn.toSignificant(6))} ${trade.currencyIn.symbol} per ${trade.currencyOut.symbol}`
    setPriceRate({ label })
  }, [trade, estTokenAmount, showInverted])

  return (
    <Text
      fontWeight={500}
      fontSize={14}
      color={theme.text2}
      style={{ justifyContent: 'center', alignItems: 'center', display: 'flex' }}
    >
      {priceRate ? (
        <>
          {priceRate.label}
          <StyledBalanceMaxMini onClick={() => setShowInverted(!showInverted)}>
            <Repeat size={14} />
          </StyledBalanceMaxMini>
        </>
      ) : (
        '-'
      )}
    </Text>
  )
}