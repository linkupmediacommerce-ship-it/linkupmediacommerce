import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiErrorMessage } from '../lib/api'
import type { Showroom } from '../lib/types'
import { Spinner } from '../components/Spinner'

export function ShowroomList() {
  const [showrooms, setShowrooms] = useState<Showroom[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get('/showrooms')
      .then((res) => setShowrooms(res.data.showrooms))
      .catch((e) => setError(apiErrorMessage(e, '쇼룸 목록을 불러오지 못했습니다.')))
  }, [])

  if (error) return <p className="text-center text-red-500 py-24">{error}</p>
  if (!showrooms) return <Spinner />

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">쇼룸 예약</h1>
        <p className="text-neutral-500">방문하실 브랜드 쇼룸을 선택해주세요.</p>
      </div>

      {showrooms.length === 0 ? (
        <p className="text-neutral-400 text-center py-16">등록된 쇼룸이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {showrooms.map((s) => (
            <Link
              key={s.id}
              to={`/showrooms/${s.id}`}
              className="block bg-white rounded-2xl overflow-hidden border border-neutral-200 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="h-44 bg-neutral-100 overflow-hidden">
                {s.image_url ? (
                  <img src={s.image_url} className="w-full h-full object-cover" alt={s.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-300">
                    <i className="fa-solid fa-image text-3xl" />
                  </div>
                )}
              </div>
              <div className="p-5">
                {s.brand_name && (
                  <span className="inline-block text-[11px] font-semibold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5 mb-1.5">
                    {s.brand_name}
                  </span>
                )}
                <h3 className="text-lg font-bold mb-1">{s.name}</h3>
                <p className="text-sm text-neutral-500 mb-2">
                  <i className="fa-solid fa-location-dot mr-1" />
                  {s.address}
                </p>
                <p className="text-sm text-neutral-400 line-clamp-2">{s.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
