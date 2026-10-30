import { Link } from 'react-router-dom'
import { useState } from 'react'

export default function Brand({ light = false }) {
  const [logoAvailable, setLogoAvailable] = useState(true)

  return (
    <Link className={`brand ${light ? 'brand-light' : ''}`} to="/">
      <span className="brand-mark">
        {logoAvailable ? (
          <img
            src="/assets/biet-logo.jpg"
            alt="Bansal Institute of Engineering and Technology logo"
            onError={() => setLogoAvailable(false)}
          />
        ) : 'BIET'}
      </span>
      <span className="brand-copy">
        <strong>Bansal Institute of Engineering</strong>
        <small>and Technology, Lucknow</small>
      </span>
    </Link>
  )
}