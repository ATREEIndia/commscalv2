import React from 'react'
import Link from 'next/link'

type Section = {
  title: string
  icon: string
  href?: string
  linkLabel?: string
  steps: React.ReactNode[]
}

const PUBLISHING_TIMES = [
  { label: 'Journal article', time: '6–10 days', note: 'From submission to publishing' },
  { label: 'Popular article', time: '~6 days', note: 'From submission to publishing' },
  { label: 'Events', time: 'Week of the event', note: 'Covered only in that week’s newsletter' },
]

const NEWSLETTER_STEPS = [
  { day: 'Mon – Sun', title: 'Submissions window', text: 'Everything added from last Monday to  Sunday is included.' },
  { day: 'Monday morning', title: 'Newsletter is built', text: 'The previous week’s submissions till sunday are compiled.' },
  { day: 'Tuesday', title: 'Newsletter is shared', text: 'Sent out every Tuesday.' },
]

const SECTIONS: Section[] = [
  {
    title: 'Add a new item to the Database',
    icon: '➕',
    href: '/database',
    linkLabel: 'Open Database',
    steps: [
      <>Go to <b>Database</b> and click <b>+ Add New</b>.</>,
      <>Fill the required fields: <b>Date of Publication / Event</b>, <b>Title</b>, <b>Publication / Document URL</b>, <b>Featuring Image</b>, <b>Description</b>, <b>Category</b> and <b>Mentions / Authors</b>.</>,
      <>Use <b>Upload a file</b> / <b>Upload an image</b> to upload directly (max 4 MB for files, 3 MB for images). For larger files, upload to the shared Drive folder and paste the link.</>,
      <>Add an <b>SM Correction Doc</b> link if the item needs a social media slide breakdown, and up to 5 <b>Tags</b> (optional).</>,
      <>Click <b>Submit</b>. Submit early so the item makes it into the right week’s newsletter.</>,
    ],
  },
  {
    title: 'Check your entries in My Data',
    icon: '📄',
    href: '/myData',
    linkLabel: 'Open My Data',
    steps: [
      <>Open <b>My Data</b> from the menu.</>,
      <>Choose <b>All</b> or <b>My entries</b>, and narrow down by <b>Category</b>.</>,
      <>Type an author’s name to filter by one or more authors. Pick from the suggestions as you type.</>,
      <>Click <b>Download Excel</b> to export the filtered list (date, title, description, mentions and URL).</>,
    ],
  },
  {
    title: 'Options in the Database',
    icon: '🗂️',
    href: '/database',
    linkLabel: 'Open Database',
    steps: [
      <>Use the <b>← →</b> arrows to move between months.</>,
      <><b>By date</b> lists items by their publication / event date. <b>By added</b> lists items added during that month.</>,
      <><b>Show My Submissions only</b> hides everyone else’s entries.</>,
      <>Click the <b>Date</b> column header to switch sorting between date and created on.</>,
      <>Click an item’s <b>title</b> to view or edit it. The person who added it and admins can also upload or replace its file and image.</>,
      <>The colour of the category shows the social media status: <span className='px-1.5 rounded bg-orange-200'>Working</span> <span className='px-1.5 rounded bg-yellow-200'>Pending Breakdown</span> <span className='px-1.5 rounded bg-green-200'>Posted</span> <span className='px-1.5 rounded bg-red-200'>No Post</span></>,
    ],
  },
]

const HomeInstrucations = () => {
  return (
    <section className='bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-col gap-5 sm:gap-6 w-full min-w-0'>
      <div>
        <h2 className='text-base sm:text-lg font-bold text-gray-800'>How it works</h2>
        <p className='text-xs sm:text-sm text-gray-500 mt-1'>Timelines for publishing and the newsletter, and a quick guide to the Database and My Data.</p>
      </div>

       {/* Guides */}
      <div className='flex flex-col gap-2'>
        {SECTIONS.map((section) => (
          <details key={section.title} className='group rounded-xl border border-gray-200 open:bg-gray-50/60'>
            <summary className='flex items-center justify-between gap-3 cursor-pointer list-none p-3 sm:p-4 [&::-webkit-details-marker]:hidden'>
              <span className='flex items-center gap-2 text-sm font-semibold text-gray-800 min-w-0'>
                <span aria-hidden>{section.icon}</span>
                <span className='truncate'>{section.title}</span>
              </span>
              <svg className='w-4 h-4 flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
              </svg>
            </summary>
            <div className='px-3 sm:px-4 pb-4'>
              <ol className='list-decimal pl-5 space-y-1.5 text-sm text-gray-600 break-words'>
                {section.steps.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
              {section.href && (
                <Link href={section.href} className='inline-block mt-3 text-xs font-medium text-blue-600 hover:text-blue-800'>
                  {section.linkLabel} →
                </Link>
              )}
            </div>
          </details>
        ))}
      </div>




      {/* Newsletter schedule */}
      <div className='rounded-xl bg-blue-50 border border-blue-100 p-4'>
        <h3 className='text-sm font-semibold text-blue-900 mb-3'>📰 Weekly newsletter</h3>
        <ol className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          {NEWSLETTER_STEPS.map((step, i) => (
            <li key={step.day} className='flex sm:flex-col gap-3 sm:gap-2 bg-white rounded-lg p-3 border border-blue-100'>
              <span className='flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center'>{i + 1}</span>
              <div className='min-w-0'>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-blue-600'>{step.day}</p>
                <p className='text-sm font-medium text-gray-800'>{step.title}</p>
                <p className='text-xs text-gray-500 mt-0.5'>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className='text-xs text-blue-900 mt-3'>
          Items added after Sunday, move to the following week’s newsletter.
        </p>
      </div>

      {/* Publishing timeframes */}
      <div className='hidden'>
        <h3 className='text-sm font-semibold text-gray-800 mb-3'>⏱️ Publishing timeframes</h3>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          {PUBLISHING_TIMES.map((item) => (
            <div key={item.label} className='rounded-xl border border-gray-200 p-3 sm:p-4'>
              <p className='text-xs text-gray-500'>{item.label}</p>
              <p className='text-lg sm:text-xl font-bold text-gray-800 mt-0.5'>{item.time}</p>
              <p className='text-xs text-gray-500 mt-1'>{item.note}</p>
            </div>
          ))}
        </div>
      </div>

     
    </section>
  )
}

export default HomeInstrucations
