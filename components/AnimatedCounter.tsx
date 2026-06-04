'use client';

import CountUp from 'react-countup';

const AnimatedCounter = ({ amount }: { amount: number }) => {
  return (
    <div className="w-full">
      <CountUp 
        decimals={0}
        separator="."
        suffix=" ₫"
        end={amount} 
      />
    </div>
  )
}

export default AnimatedCounter