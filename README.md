This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# Ments - Social Platform

Ments is a modern social platform built with Next.js, Tailwind CSS, and Supabase. It features a responsive design that works great on both mobile and web interfaces, with multi-theme support and a component-based architecture for maintainable code.

![Ments Dashboard](https://via.placeholder.com/800x450.png?text=Ments+Dashboard)

## Features

- **Responsive Design**: Works seamlessly on both mobile and web interfaces
- **Multi-theme Support**: Choose between light and dark modes, plus multiple color schemes
- **Component-based Architecture**: Modular components for maintainable code
- **Authentication**: Secure login with Google via Supabase
- **Posts System**: Create, view, and interact with posts
- **Real-time Updates**: Powered by Supabase's real-time capabilities

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Supabase (Authentication, Database, Storage)
- **Styling**: Tailwind CSS with custom theming
- **Icons**: Lucide React
- **Animation**: Framer Motion

## Getting Started

### Prerequisites

- Node.js 18.0 or later
- A Supabase account and project

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/ments.git
cd ments
```

2. Install dependencies

```bash
npm install
```

3. Create a `.env.local` file in the root directory with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application

## Project Structure

```
/src
  /api           # API functions for data fetching
  /app           # Next.js app router pages
  /components    # Reusable UI components
    /layout      # Layout components
    /posts       # Post-related components
    /ui          # Basic UI components
  /context       # React context providers
    /theme       # Theme context for multi-theme support
  /utils         # Utility functions
```

## Database Schema

The application uses the following database schema in Supabase:

### user Table

```sql
create table public.users (
  id uuid not null default extensions.uuid_generate_v4 (),
  email text not null,
  username text not null,
  full_name text not null,
  about text null,
  current_city text null,
  tagline text null,
  user_type text not null,
  created_at timestamp with time zone null default now(),
  avatar_url text null,
  banner_image text null,
  is_verified boolean not null default false,
  fcm_token text null,
  is_onboarding_done boolean not null default false,
  last_seen timestamp with time zone null default now(),
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_username_key unique (username),
  constraint users_user_type_check check (
    (
      user_type = any (array['mentor'::text, 'normal_user'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_users_is_verified on public.users using btree (is_verified) TABLESPACE pg_default;

create trigger trg_username_lowercase BEFORE INSERT
or
update on users for EACH row
execute FUNCTION enforce_username_lowercase ();
```

## Deployment

This application can be deployed to Vercel with minimal configuration:

1. Push your code to a GitHub repository
2. Import the project into Vercel
3. Add your environment variables in the Vercel dashboard
4. Deploy!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
