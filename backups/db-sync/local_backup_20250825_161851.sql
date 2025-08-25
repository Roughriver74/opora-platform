--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.submissions DROP CONSTRAINT IF EXISTS submissions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.submissions DROP CONSTRAINT IF EXISTS submissions_form_id_fkey;
ALTER TABLE IF EXISTS ONLY public.submissions DROP CONSTRAINT IF EXISTS submissions_assigned_to_id_fkey;
ALTER TABLE IF EXISTS ONLY public.submission_history DROP CONSTRAINT IF EXISTS submission_history_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.submission_history DROP CONSTRAINT IF EXISTS submission_history_submission_id_fkey;
ALTER TABLE IF EXISTS ONLY public.form_fields DROP CONSTRAINT IF EXISTS form_fields_form_id_fkey;
ALTER TABLE IF EXISTS ONLY public.admin_tokens DROP CONSTRAINT IF EXISTS admin_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY beton.submissions DROP CONSTRAINT IF EXISTS submissions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY beton.submissions DROP CONSTRAINT IF EXISTS submissions_form_id_fkey;
ALTER TABLE IF EXISTS ONLY beton.submissions DROP CONSTRAINT IF EXISTS submissions_assigned_to_id_fkey;
ALTER TABLE IF EXISTS ONLY beton.submission_history DROP CONSTRAINT IF EXISTS submission_history_user_id_fkey;
ALTER TABLE IF EXISTS ONLY beton.submission_history DROP CONSTRAINT IF EXISTS submission_history_submission_id_fkey;
ALTER TABLE IF EXISTS ONLY beton.form_fields DROP CONSTRAINT IF EXISTS form_fields_form_id_fkey;
ALTER TABLE IF EXISTS ONLY beton.admin_tokens DROP CONSTRAINT IF EXISTS admin_tokens_user_id_fkey;
DROP TRIGGER IF EXISTS update_submission_history_updated_at ON public.submission_history;
DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
DROP TRIGGER IF EXISTS update_admin_tokens_updated_at ON public.admin_tokens;
DROP TRIGGER IF EXISTS update_users_updated_at ON beton.users;
DROP TRIGGER IF EXISTS update_submissions_updated_at ON beton.submissions;
DROP TRIGGER IF EXISTS update_settings_updated_at ON beton.settings;
DROP TRIGGER IF EXISTS update_forms_updated_at ON beton.forms;
DROP TRIGGER IF EXISTS update_form_fields_updated_at ON beton.form_fields;
DROP INDEX IF EXISTS public.idx_submissions_user_name_trgm;
DROP INDEX IF EXISTS public.idx_submissions_user_email_trgm;
DROP INDEX IF EXISTS public.idx_submissions_title_trgm;
DROP INDEX IF EXISTS public.idx_submissions_status_created;
DROP INDEX IF EXISTS public.idx_submissions_number_trgm;
DROP INDEX IF EXISTS public.idx_submissions_form_data;
DROP INDEX IF EXISTS public.idx_submissions_assigned_to_name;
DROP INDEX IF EXISTS public.idx_submission_history_user;
DROP INDEX IF EXISTS public.idx_submission_history_submission;
DROP INDEX IF EXISTS public.idx_settings_key;
DROP INDEX IF EXISTS public.idx_settings_category;
DROP INDEX IF EXISTS public.idx_admin_tokens_user;
DROP INDEX IF EXISTS public.idx_admin_tokens_token;
DROP INDEX IF EXISTS beton.idx_users_role;
DROP INDEX IF EXISTS beton.idx_users_is_active;
DROP INDEX IF EXISTS beton.idx_users_email_lower;
DROP INDEX IF EXISTS beton.idx_users_bitrix_user_id;
DROP INDEX IF EXISTS beton.idx_submissions_year_month;
DROP INDEX IF EXISTS beton.idx_submissions_user_status;
DROP INDEX IF EXISTS beton.idx_submissions_user_email;
DROP INDEX IF EXISTS beton.idx_submissions_tags;
DROP INDEX IF EXISTS beton.idx_submissions_status_created;
DROP INDEX IF EXISTS beton.idx_submissions_priority_status;
DROP INDEX IF EXISTS beton.idx_submissions_form_name;
DROP INDEX IF EXISTS beton.idx_submissions_form_created;
DROP INDEX IF EXISTS beton.idx_submissions_bitrix_sync;
DROP INDEX IF EXISTS beton.idx_submissions_assigned_name;
DROP INDEX IF EXISTS beton.idx_submissions_assigned;
DROP INDEX IF EXISTS beton.idx_submission_history_user;
DROP INDEX IF EXISTS beton.idx_submission_history_submission;
DROP INDEX IF EXISTS beton.idx_submission_history_action;
DROP INDEX IF EXISTS beton.idx_settings_category;
DROP INDEX IF EXISTS beton.idx_forms_is_active;
DROP INDEX IF EXISTS beton.idx_form_fields_type;
DROP INDEX IF EXISTS beton.idx_form_fields_name_form;
DROP INDEX IF EXISTS beton.idx_form_fields_linked_fields;
DROP INDEX IF EXISTS beton.idx_form_fields_form_section_order;
DROP INDEX IF EXISTS beton.idx_form_fields_form_order;
DROP INDEX IF EXISTS beton.idx_form_fields_dynamic_source;
DROP INDEX IF EXISTS beton.idx_admin_tokens_user;
DROP INDEX IF EXISTS beton.idx_admin_tokens_active_expires;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.submissions DROP CONSTRAINT IF EXISTS submissions_submission_number_key;
ALTER TABLE IF EXISTS ONLY public.submissions DROP CONSTRAINT IF EXISTS submissions_pkey;
ALTER TABLE IF EXISTS ONLY public.submission_history DROP CONSTRAINT IF EXISTS submission_history_pkey;
ALTER TABLE IF EXISTS ONLY public.settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE IF EXISTS ONLY public.settings DROP CONSTRAINT IF EXISTS settings_key_key;
ALTER TABLE IF EXISTS ONLY public.forms DROP CONSTRAINT IF EXISTS forms_pkey;
ALTER TABLE IF EXISTS ONLY public.forms DROP CONSTRAINT IF EXISTS forms_name_key;
ALTER TABLE IF EXISTS ONLY public.form_fields DROP CONSTRAINT IF EXISTS form_fields_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_tokens DROP CONSTRAINT IF EXISTS admin_tokens_token_key;
ALTER TABLE IF EXISTS ONLY public.admin_tokens DROP CONSTRAINT IF EXISTS admin_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.migrations DROP CONSTRAINT IF EXISTS "PK_8c82d7f526340ab734260ea46be";
ALTER TABLE IF EXISTS ONLY beton.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY beton.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY beton.submissions DROP CONSTRAINT IF EXISTS submissions_submission_number_key;
ALTER TABLE IF EXISTS ONLY beton.submissions DROP CONSTRAINT IF EXISTS submissions_pkey;
ALTER TABLE IF EXISTS ONLY beton.submission_history DROP CONSTRAINT IF EXISTS submission_history_pkey;
ALTER TABLE IF EXISTS ONLY beton.settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE IF EXISTS ONLY beton.settings DROP CONSTRAINT IF EXISTS settings_key_key;
ALTER TABLE IF EXISTS ONLY beton.forms DROP CONSTRAINT IF EXISTS forms_pkey;
ALTER TABLE IF EXISTS ONLY beton.forms DROP CONSTRAINT IF EXISTS forms_name_key;
ALTER TABLE IF EXISTS ONLY beton.form_fields DROP CONSTRAINT IF EXISTS form_fields_pkey;
ALTER TABLE IF EXISTS ONLY beton.admin_tokens DROP CONSTRAINT IF EXISTS admin_tokens_token_key;
ALTER TABLE IF EXISTS ONLY beton.admin_tokens DROP CONSTRAINT IF EXISTS admin_tokens_pkey;
ALTER TABLE IF EXISTS public.migrations ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.submissions;
DROP TABLE IF EXISTS public.submission_history;
DROP TABLE IF EXISTS public.settings;
DROP SEQUENCE IF EXISTS public.migrations_id_seq;
DROP TABLE IF EXISTS public.migrations;
DROP TABLE IF EXISTS public.forms;
DROP TABLE IF EXISTS public.form_fields;
DROP TABLE IF EXISTS public.admin_tokens;
DROP TABLE IF EXISTS beton.users;
DROP VIEW IF EXISTS beton.submission_statistics;
DROP TABLE IF EXISTS beton.submissions;
DROP TABLE IF EXISTS beton.submission_history;
DROP TABLE IF EXISTS beton.settings;
DROP TABLE IF EXISTS beton.forms;
DROP TABLE IF EXISTS beton.form_fields;
DROP TABLE IF EXISTS beton.admin_tokens;
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS beton.update_updated_at_column();
DROP FUNCTION IF EXISTS beton.generate_submission_number();
DROP TYPE IF EXISTS public.submission_history_actiontype_enum;
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS pg_trgm;
DROP SCHEMA IF EXISTS beton;
--
-- Name: beton; Type: SCHEMA; Schema: -; Owner: beton_user
--

CREATE SCHEMA beton;


ALTER SCHEMA beton OWNER TO beton_user;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: submission_history_actiontype_enum; Type: TYPE; Schema: public; Owner: beton_user
--

CREATE TYPE public.submission_history_actiontype_enum AS ENUM (
    'create',
    'update',
    'status_change',
    'assign',
    'comment',
    'sync_bitrix',
    'delete'
);


ALTER TYPE public.submission_history_actiontype_enum OWNER TO beton_user;

--
-- Name: generate_submission_number(); Type: FUNCTION; Schema: beton; Owner: beton_user
--

CREATE FUNCTION beton.generate_submission_number() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_number VARCHAR;
BEGIN
    new_number := TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    RETURN new_number;
END;
$$;


ALTER FUNCTION beton.generate_submission_number() OWNER TO beton_user;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: beton; Owner: beton_user
--

CREATE FUNCTION beton.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION beton.update_updated_at_column() OWNER TO beton_user;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: beton_user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO beton_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_tokens; Type: TABLE; Schema: beton; Owner: beton_user
--

CREATE TABLE beton.admin_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    token character varying(255) NOT NULL,
    user_id uuid,
    purpose text NOT NULL,
    is_active boolean DEFAULT true,
    last_used_at timestamp without time zone,
    expires_at timestamp without time zone NOT NULL,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE beton.admin_tokens OWNER TO beton_user;

--
-- Name: form_fields; Type: TABLE; Schema: beton; Owner: beton_user
--

CREATE TABLE beton.form_fields (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    form_id uuid,
    section_id character varying(100),
    name character varying(255) NOT NULL,
    label character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    required boolean DEFAULT false,
    placeholder character varying(255),
    bitrix_field_id character varying(100),
    bitrix_field_type character varying(100),
    bitrix_entity character varying(50),
    options jsonb,
    dynamic_source jsonb,
    linked_fields jsonb,
    order_index integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE beton.form_fields OWNER TO beton_user;

--
-- Name: forms; Type: TABLE; Schema: beton; Owner: beton_user
--

CREATE TABLE beton.forms (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    bitrix_deal_category character varying(100),
    success_message text DEFAULT 'Спасибо! Ваша заявка успешно отправлена.'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE beton.forms OWNER TO beton_user;

--
-- Name: settings; Type: TABLE; Schema: beton; Owner: beton_user
--

CREATE TABLE beton.settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    key character varying(255) NOT NULL,
    value jsonb NOT NULL,
    category character varying(50) DEFAULT 'system'::character varying,
    description text,
    is_public boolean DEFAULT false,
    is_encrypted boolean DEFAULT false,
    validation jsonb,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT settings_category_check CHECK (((category)::text = ANY ((ARRAY['system'::character varying, 'bitrix'::character varying, 'email'::character varying, 'notification'::character varying, 'security'::character varying, 'ui'::character varying])::text[])))
);


ALTER TABLE beton.settings OWNER TO beton_user;

--
-- Name: submission_history; Type: TABLE; Schema: beton; Owner: beton_user
--

CREATE TABLE beton.submission_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    submission_id uuid,
    user_id uuid,
    action_type character varying(50) NOT NULL,
    description text NOT NULL,
    changes jsonb,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT submission_history_action_type_check CHECK (((action_type)::text = ANY ((ARRAY['create'::character varying, 'update'::character varying, 'status_change'::character varying, 'assign'::character varying, 'comment'::character varying, 'sync_bitrix'::character varying, 'delete'::character varying])::text[])))
);


ALTER TABLE beton.submission_history OWNER TO beton_user;

--
-- Name: submissions; Type: TABLE; Schema: beton; Owner: beton_user
--

CREATE TABLE beton.submissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    submission_number character varying(50) NOT NULL,
    form_id uuid,
    user_id uuid,
    assigned_to_id uuid,
    title character varying(500) NOT NULL,
    status character varying(50) DEFAULT 'NEW'::character varying,
    priority character varying(20) DEFAULT 'medium'::character varying,
    bitrix_deal_id character varying(100),
    bitrix_category_id character varying(100),
    bitrix_sync_status character varying(20) DEFAULT 'pending'::character varying,
    bitrix_sync_error text,
    notes text,
    tags text[],
    form_name character varying(255),
    form_title character varying(255),
    user_email character varying(255),
    user_name character varying(255),
    assigned_to_name character varying(255),
    day_of_week smallint,
    month_of_year smallint,
    year_created integer,
    processing_time_minutes integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT submissions_bitrix_sync_status_check CHECK (((bitrix_sync_status)::text = ANY ((ARRAY['pending'::character varying, 'synced'::character varying, 'failed'::character varying])::text[]))),
    CONSTRAINT submissions_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT submissions_month_of_year_check CHECK (((month_of_year >= 1) AND (month_of_year <= 12))),
    CONSTRAINT submissions_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[])))
);


ALTER TABLE beton.submissions OWNER TO beton_user;

--
-- Name: submission_statistics; Type: VIEW; Schema: beton; Owner: beton_user
--

CREATE VIEW beton.submission_statistics AS
 SELECT count(*) AS total_submissions,
    count(
        CASE
            WHEN ((status)::text = 'NEW'::text) THEN 1
            ELSE NULL::integer
        END) AS new_submissions,
    count(
        CASE
            WHEN ((status)::text = ANY ((ARRAY['WON'::character varying, 'COMPLETED'::character varying])::text[])) THEN 1
            ELSE NULL::integer
        END) AS completed_submissions,
    count(
        CASE
            WHEN (date(created_at) = CURRENT_DATE) THEN 1
            ELSE NULL::integer
        END) AS today_submissions,
    count(
        CASE
            WHEN (created_at >= (CURRENT_DATE - '7 days'::interval)) THEN 1
            ELSE NULL::integer
        END) AS week_submissions,
    count(
        CASE
            WHEN (created_at >= date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)) THEN 1
            ELSE NULL::integer
        END) AS month_submissions,
    avg(processing_time_minutes) AS avg_processing_time
   FROM beton.submissions;


ALTER VIEW beton.submission_statistics OWNER TO beton_user;

--
-- Name: users; Type: TABLE; Schema: beton; Owner: beton_user
--

CREATE TABLE beton.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    phone character varying(50),
    bitrix_id character varying(100),
    bitrix_user_id character varying(100),
    status character varying(20) DEFAULT 'active'::character varying,
    role character varying(20) DEFAULT 'user'::character varying,
    is_active boolean DEFAULT true,
    settings jsonb DEFAULT '{"onlyMyCompanies": false}'::jsonb,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying])::text[]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


ALTER TABLE beton.users OWNER TO beton_user;

--
-- Name: admin_tokens; Type: TABLE; Schema: public; Owner: beton_user
--

CREATE TABLE public.admin_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token character varying(500) NOT NULL,
    user_id uuid,
    purpose character varying(100),
    expires_at timestamp without time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.admin_tokens OWNER TO beton_user;

--
-- Name: form_fields; Type: TABLE; Schema: public; Owner: beton_user
--

CREATE TABLE public.form_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    form_id uuid,
    name character varying(255) NOT NULL,
    label character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    required boolean DEFAULT false,
    placeholder character varying(255),
    bitrix_field_id character varying(100),
    bitrix_field_type character varying(50),
    bitrix_entity character varying(50),
    section_id character varying(100),
    options jsonb,
    dynamic_source jsonb,
    linked_fields jsonb,
    "order" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.form_fields OWNER TO beton_user;

--
-- Name: forms; Type: TABLE; Schema: public; Owner: beton_user
--

CREATE TABLE public.forms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    bitrix_deal_category character varying(50),
    success_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.forms OWNER TO beton_user;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: beton_user
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO beton_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: beton_user
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO beton_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: beton_user
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: beton_user
--

CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(255) NOT NULL,
    value jsonb NOT NULL,
    category character varying(50) DEFAULT 'system'::character varying NOT NULL,
    description text,
    is_public boolean DEFAULT false,
    is_encrypted boolean DEFAULT false,
    validation jsonb,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.settings OWNER TO beton_user;

--
-- Name: submission_history; Type: TABLE; Schema: public; Owner: beton_user
--

CREATE TABLE public.submission_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    user_id uuid,
    changes jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    action_type public.submission_history_actiontype_enum NOT NULL,
    description text NOT NULL,
    metadata jsonb
);


ALTER TABLE public.submission_history OWNER TO beton_user;

--
-- Name: submissions; Type: TABLE; Schema: public; Owner: beton_user
--

CREATE TABLE public.submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_number character varying(50) NOT NULL,
    form_id uuid,
    user_id uuid,
    title character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'NEW'::character varying,
    priority character varying(50) DEFAULT 'medium'::character varying,
    assigned_to_id uuid,
    notes text,
    tags text[],
    bitrix_deal_id character varying(100),
    bitrix_category_id character varying(50),
    bitrix_sync_status character varying(50) DEFAULT 'pending'::character varying,
    bitrix_sync_error text,
    form_name character varying(255),
    form_title character varying(255),
    user_email character varying(255),
    user_name character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_to_name character varying(255),
    day_of_week smallint,
    month_of_year smallint,
    year_created integer,
    processing_time_minutes integer,
    data jsonb,
    form_data jsonb NOT NULL
);


ALTER TABLE public.submissions OWNER TO beton_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: beton_user
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    phone character varying(50),
    role character varying(50) DEFAULT 'user'::character varying,
    status character varying(50) DEFAULT 'active'::character varying,
    is_active boolean DEFAULT true,
    settings jsonb DEFAULT '{}'::jsonb,
    bitrix_user_id character varying(100),
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO beton_user;

--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Data for Name: admin_tokens; Type: TABLE DATA; Schema: beton; Owner: beton_user
--

COPY beton.admin_tokens (id, token, user_id, purpose, is_active, last_used_at, expires_at, ip_address, user_agent, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: form_fields; Type: TABLE DATA; Schema: beton; Owner: beton_user
--

COPY beton.form_fields (id, form_id, section_id, name, label, type, required, placeholder, bitrix_field_id, bitrix_field_type, bitrix_entity, options, dynamic_source, linked_fields, order_index, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: forms; Type: TABLE DATA; Schema: beton; Owner: beton_user
--

COPY beton.forms (id, name, title, description, is_active, bitrix_deal_category, success_message, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: beton; Owner: beton_user
--

COPY beton.settings (id, key, value, category, description, is_public, is_encrypted, validation, metadata, created_at, updated_at) FROM stdin;
01d8a814-debb-47b4-8da4-be3600248daa	app.name	"Beton CRM"	system	Название приложения	t	f	\N	\N	2025-08-06 12:11:23.694758	2025-08-06 12:11:23.694758
23a3c4d8-06b8-4bb7-8743-46a8a5633252	app.version	"1.0.0"	system	Версия приложения	t	f	\N	\N	2025-08-06 12:11:23.694758	2025-08-06 12:11:23.694758
43dc4a7e-3520-481c-a6e0-03f1a293fb04	maintenance.mode	false	system	Режим обслуживания	f	f	\N	\N	2025-08-06 12:11:23.694758	2025-08-06 12:11:23.694758
\.


--
-- Data for Name: submission_history; Type: TABLE DATA; Schema: beton; Owner: beton_user
--

COPY beton.submission_history (id, submission_id, user_id, action_type, description, changes, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: submissions; Type: TABLE DATA; Schema: beton; Owner: beton_user
--

COPY beton.submissions (id, submission_number, form_id, user_id, assigned_to_id, title, status, priority, bitrix_deal_id, bitrix_category_id, bitrix_sync_status, bitrix_sync_error, notes, tags, form_name, form_title, user_email, user_name, assigned_to_name, day_of_week, month_of_year, year_created, processing_time_minutes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: beton; Owner: beton_user
--

COPY beton.users (id, email, password, first_name, last_name, phone, bitrix_id, bitrix_user_id, status, role, is_active, settings, last_login, created_at, updated_at) FROM stdin;
634cda41-5389-4a70-b11a-051b0ede49a5	admin@beton.local	$2b$10$YourHashedPasswordHere	Admin	User	\N	\N	\N	active	admin	t	{"onlyMyCompanies": false}	\N	2025-08-06 12:11:23.69423	2025-08-06 12:11:23.69423
\.


--
-- Data for Name: admin_tokens; Type: TABLE DATA; Schema: public; Owner: beton_user
--

COPY public.admin_tokens (id, token, user_id, purpose, expires_at, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: form_fields; Type: TABLE DATA; Schema: public; Owner: beton_user
--

COPY public.form_fields (id, form_id, name, label, type, required, placeholder, bitrix_field_id, bitrix_field_type, bitrix_entity, section_id, options, dynamic_source, linked_fields, "order", created_at, updated_at) FROM stdin;
4232beaa-436f-45d4-837d-d55461d959f6	55c70b46-a204-4fd3-8e93-9abc078ab8aa	field_1750265427938	Бетон*(Завод)	autocomplete	f	\N	UF_CRM_1726227410		\N	\N	[]	{"source": "catalog", "enabled": true}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750365587259", "sourceFieldLabel": "Бетон*(Покупатель)", "sourceSectionName": "Раздел 1"}}	9	2025-06-18 19:50:27.943	2025-08-25 12:58:10.175466
b3a84c56-9812-42a1-9b16-6a86e3b4f03a	55c70b46-a204-4fd3-8e93-9abc078ab8aa	field_1750365852471	Объем м3 (завод)	number	f	\N	UF_CRM_1703322858101		\N	6852ee11d6e5781f7088a649	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750365626978", "sourceFieldLabel": "Объем м3", "sourceSectionName": "Раздел 11"}}	11	2025-06-19 23:44:12.481	2025-08-25 12:58:10.179908
e06f6b72-d6c5-4030-8047-664ca267968b	55c70b46-a204-4fd3-8e93-9abc078ab8aa	field_1750366058589	Раствор	divider	f	\N			\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	12	2025-06-19 23:47:38.596	2025-08-25 12:58:10.18079
64a4e69b-6c0d-44a5-9749-b6da174e1305	55c70b46-a204-4fd3-8e93-9abc078ab8aa	section_1750265361735	test	header	f	\N	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	15	2025-06-18 19:49:21.75	2025-08-25 12:58:10.193193
e8ad7748-d188-4e62-a6c6-3e7558a21772	55c70b46-a204-4fd3-8e93-9abc078ab8aa	field_1750366113785	Закупка цена	number	f	\N	UF_CRM_1701767745071		\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750365647032", "sourceFieldLabel": "Продажа цена", "sourceSectionName": "Раздел 11"}}	10	2025-06-19 23:48:33.794	2025-08-25 12:58:10.180037
975338f6-e430-43e6-b1e3-20447bdc8da8	55c70b46-a204-4fd3-8e93-9abc078ab8aa	field_1756126649357	Поле 21	text	f	\N			\N	\N	\N	\N	\N	21	2025-08-25 12:57:29.391136	2025-08-25 12:57:29.391136
43354e93-3990-4b37-b9f7-ab4e2cfeb2ff	55c70b46-a204-4fd3-8e93-9abc078ab8aa	field_1750365626978	Объем м3	number	f	\N	UF_CRM_DEAL_AMO_SDLLUUKQTVRWOVQK		\N	6855539ed3b1f16f7b19d1f5	[]	{"enabled": false}	{"enabled": false, "mappings": []}	14	2025-06-19 23:40:26.988	2025-08-25 12:58:10.193923
6bf95c79-2ec1-4b08-86f0-b7f499d7322a	55c70b46-a204-4fd3-8e93-9abc078ab8aa	section_1750422430847	Раздел 3	header	f	\N	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	17	2025-06-20 15:27:10.861	2025-08-25 12:58:10.19804
474f7341-4c1c-47e4-bf89-a0155d0f8855	55c70b46-a204-4fd3-8e93-9abc078ab8aa	field_1750365988007	Закупка цена	number	f	\N	UF_CRM_1701767745071		\N	6852ee11d6e5781f7088a649	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750365647032", "sourceFieldLabel": "Продажа цена", "sourceSectionName": "Раздел 11"}}	13	2025-06-19 23:46:28.017	2025-08-25 12:58:10.185289
860cb093-8e30-4508-a563-0b702fddd63e	55c70b46-a204-4fd3-8e93-9abc078ab8aa	field_1755172588705	Время АБН(дата/время)	date	f	\N	UF_CRM_1732302589098	datetime	\N	\N	[]	\N	\N	1	2025-08-14 11:56:28.729856	2025-08-25 12:58:10.144732
637bea5e-52e7-4f57-acfa-7bf656dbe543	55c70b46-a204-4fd3-8e93-9abc078ab8aa	field_1750672643963	Название (Тест)	text	f	\N	TITLE		\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	4	2025-06-23 12:57:23.986	2025-08-25 12:58:10.152029
484a59aa-cff0-4c7c-a6bf-b2c4d71c0660	55c70b46-a204-4fd3-8e93-9abc078ab8aa	field_1750365659748	Раствор	divider	f	\N			\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	3	2025-06-19 23:40:59.754	2025-08-25 12:58:10.156775
89bd4465-4e05-4a54-a565-0361a3a870a0	55c70b46-a204-4fd3-8e93-9abc078ab8aa	section_1750422434380	Раздел 4	header	f	\N	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	18	2025-06-20 15:27:14.393	2025-08-25 12:58:10.198151
dc3defed-ef4a-4191-a24d-81b5a1e0ef49	55c70b46-a204-4fd3-8e93-9abc078ab8aa	field_1754560054970	Компания	autocomplete	f	\N	COMPANY_ID	crm_company	\N	\N	[]	{"source": "companies", "enabled": true}	\N	2	2025-08-07 09:47:34.994479	2025-08-25 12:58:10.157064
c0fa1747-351c-48a3-9be1-ab7fe32dbdaa	55c70b46-a204-4fd3-8e93-9abc078ab8aa	field_1750417542374	Комментарий	textarea	f	\N	COMMENTS		\N	685553a2d3b1f16f7b19d1fb	[]	{"enabled": false}	{"enabled": false, "mappings": []}	16	2025-06-20 14:05:42.397	2025-08-25 12:58:10.197716
6e445fb5-3593-47b7-85df-87f0649054e4	55c70b46-a204-4fd3-8e93-9abc078ab8aa	field_1754580171454	Цена доставки	number	f	\N	UF_CRM_1701765793423	double	\N	\N	[]	\N	\N	19	2025-08-07 15:22:51.468782	2025-08-25 12:58:10.205278
1f8a7697-ca9f-4ccb-9cd7-e29ca7a46e9e	55c70b46-a204-4fd3-8e93-9abc078ab8aa	field_1750365827152	Объем раствора м3	text	f	\N	UF_CRM_1717006045698		\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	6	2025-06-19 23:43:47.161	2025-08-25 12:58:10.159898
c7720077-86cf-4e1a-b730-5c190252f1ce	55c70b46-a204-4fd3-8e93-9abc078ab8aa	Раствор завод	Раствор*(завод)	autocomplete	f	\N	UF_CRM_1726645231		\N	\N	[]	{"source": "catalog", "enabled": true}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750365704478", "sourceFieldLabel": "Раствор*(покупатель)", "sourceSectionName": "Раздел 11"}}	5	2025-06-19 23:47:05.943	2025-08-25 12:58:10.160428
ad6e757c-f6d1-4d7a-92ba-80d2a7a68ff0	55c70b46-a204-4fd3-8e93-9abc078ab8aa	field_1755172434743	Поле 19	text	f	\N			\N	\N	\N	\N	\N	20	2025-08-14 11:53:54.763964	2025-08-14 14:09:40.146226
9a5b861e-c649-4420-bc8f-cf37aecd2a4d	55c70b46-a204-4fd3-8e93-9abc078ab8aa	divider_1750366516014	Бетон	divider	f	\N	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	7	2025-06-19 23:55:16.021	2025-08-25 12:58:10.165893
b8996cbf-decf-416a-bbb7-3730b6b0cde8	55c70b46-a204-4fd3-8e93-9abc078ab8aa	divider_1750366418736	Бетон	text	f	\N	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	8	2025-06-19 23:53:38.748	2025-08-25 12:58:10.175132
\.


--
-- Data for Name: forms; Type: TABLE DATA; Schema: public; Owner: beton_user
--

COPY public.forms (id, name, title, description, is_active, bitrix_deal_category, success_message, created_at, updated_at) FROM stdin;
55c70b46-a204-4fd3-8e93-9abc078ab8aa	1	2		t	\N	Спасибо! Ваша заявка успешно отправлена.	2025-06-18 19:44:21.124	2025-06-23 18:53:30.36
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: beton_user
--

COPY public.migrations (id, "timestamp", name) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: beton_user
--

COPY public.settings (id, key, value, category, description, is_public, is_encrypted, validation, metadata, created_at, updated_at) FROM stdin;
45ead182-a148-401d-8d12-aeba7b636521	submissions.enable_copying	true	system	Разрешить копирование заявок пользователями	t	f	\N	\N	2025-08-06 18:56:23.213959	2025-08-06 18:56:23.213959
42bdbcfc-58dd-427e-bb3f-023d266a0438	submissions.copy_button_text	"Копировать заявку"	ui	Текст кнопки копирования заявки	t	f	\N	\N	2025-08-06 18:56:23.221874	2025-08-06 18:56:23.221874
1e7d88ac-abb9-4dd4-b797-0c88e0de509d	submissions.allow_user_status_change	true	system	Разрешить пользователям изменять статус своих заявок	t	f	\N	\N	2025-08-06 18:56:23.224544	2025-08-06 18:56:23.224544
b558f369-3601-45c6-8ba0-6a8f47f51999	submissions.allow_user_edit	true	system	Разрешить пользователям редактировать свои заявки	t	f	\N	\N	2025-08-06 18:56:23.22789	2025-08-06 18:56:23.22789
75f1ab04-84ab-4511-b057-a565d14e8293	forms.auto_save_interval	30000	system	Интервал автосохранения форм в миллисекундах	f	f	{"max": 300000, "min": 5000, "type": "number"}	\N	2025-08-06 18:56:23.2309	2025-08-06 18:56:23.2309
207774b6-6e6d-476e-8e3b-3feb45cc54b7	ui.theme_mode	"light"	ui	Режим темы интерфейса (light/dark/auto)	t	f	{"enum": ["light", "dark", "auto"], "type": "string"}	\N	2025-08-06 18:56:23.233716	2025-08-06 18:56:23.233716
17838bb2-6189-4730-a6b5-71459782bffe	system.debug_mode	false	system	Режим отладки для разработчиков	f	f	{"type": "boolean"}	\N	2025-08-06 18:56:23.236085	2025-08-06 18:56:23.236085
\.


--
-- Data for Name: submission_history; Type: TABLE DATA; Schema: public; Owner: beton_user
--

COPY public.submission_history (id, submission_id, user_id, changes, created_at, updated_at, action_type, description, metadata) FROM stdin;
51cb599d-7780-4571-80ee-d276db94a3f3	c77f3752-abd9-4559-92a8-3fdc79b5ab5e	\N	\N	2025-08-10 15:35:04.680847	2025-08-10 15:35:04.680847	create	Заявка создана	\N
d9eb24d1-df52-4085-ab8b-a88b76472c5a	c77f3752-abd9-4559-92a8-3fdc79b5ab5e	\N	\N	2025-08-10 15:35:06.400288	2025-08-10 15:35:06.400288	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 19890)	{"bitrixDealId": "19890"}
eaa207d1-1fd8-4fcc-83c2-bf5851a13f54	44362009-335e-4900-8ed5-445e39e76d71	\N	\N	2025-08-10 15:49:39.857113	2025-08-10 15:49:39.857113	create	Заявка создана	\N
c7f439cf-369e-43ff-8264-013911390e41	44362009-335e-4900-8ed5-445e39e76d71	\N	\N	2025-08-10 15:49:41.762601	2025-08-10 15:49:41.762601	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 19891)	{"bitrixDealId": "19891"}
9c460622-e4e4-466f-93b7-0675f895e437	d357d934-12ae-453e-8a15-2b3e8e1d983e	\N	\N	2025-08-10 16:38:36.889418	2025-08-10 16:38:36.889418	sync_bitrix	Ошибка синхронизации с Bitrix24: Request failed with status code 400	{"error": "Request failed with status code 400"}
7573d322-5c5f-4057-a9a2-ada4a894237d	697e18a4-fd01-478f-a0a6-7a9d0e066371	\N	\N	2025-08-10 17:11:58.363858	2025-08-10 17:11:58.363858	sync_bitrix	Ошибка синхронизации с Bitrix24: Request failed with status code 400	{"error": "Request failed with status code 400"}
30c4b00d-58fa-485f-b301-5ddaeb87bc24	0e67527d-0ec7-4c14-8809-3e44b18f20cc	42791e1c-fa78-44ae-aa2e-632226f460ab	\N	2025-08-10 17:18:17.068419	2025-08-10 17:18:17.068419	create	Заявка создана	\N
f6825cb3-3e40-4011-ab46-dc59f985e464	0e67527d-0ec7-4c14-8809-3e44b18f20cc	\N	\N	2025-08-10 17:18:18.673463	2025-08-10 17:18:18.673463	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 19892)	{"bitrixDealId": "19892"}
079a8754-a0b9-4fd7-88da-0ae3f8914853	42812372-19e5-4a15-87a2-0594624ca962	42791e1c-fa78-44ae-aa2e-632226f460ab	\N	2025-08-10 17:18:56.897006	2025-08-10 17:18:56.897006	create	Заявка создана	\N
5f53a43d-c2a4-4d26-b166-9f2d6d4e024e	42812372-19e5-4a15-87a2-0594624ca962	\N	\N	2025-08-10 17:18:58.509642	2025-08-10 17:18:58.509642	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 19893)	{"bitrixDealId": "19893"}
7eed0ae7-4aaf-44d4-9f06-3dd204d01c16	ba30d5fc-30ea-4941-8a1a-3dead8a2fb85	42791e1c-fa78-44ae-aa2e-632226f460ab	\N	2025-08-10 17:30:06.164893	2025-08-10 17:30:06.164893	create	Заявка создана	\N
987fa362-70a5-4279-b2c1-5a4d50225cd9	ba30d5fc-30ea-4941-8a1a-3dead8a2fb85	\N	\N	2025-08-10 17:30:07.934592	2025-08-10 17:30:07.934592	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 19894)	{"bitrixDealId": "19894"}
b667c6a3-756f-4fb3-88cf-aa435ed84eeb	ba30d5fc-30ea-4941-8a1a-3dead8a2fb85	\N	\N	2025-08-10 17:31:30.192468	2025-08-10 17:31:30.192468	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
a200972f-9653-4f07-a6b6-a8b8d28c39c8	ba30d5fc-30ea-4941-8a1a-3dead8a2fb85	\N	\N	2025-08-10 17:31:48.084518	2025-08-10 17:31:48.084518	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
d8b201ac-0e0f-4c1d-805e-b8574532dd55	ba30d5fc-30ea-4941-8a1a-3dead8a2fb85	\N	\N	2025-08-10 17:35:27.841914	2025-08-10 17:35:27.841914	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
9e4f7bfa-622f-4a19-8a84-300836a15684	ba30d5fc-30ea-4941-8a1a-3dead8a2fb85	\N	\N	2025-08-10 17:43:18.518247	2025-08-10 17:43:18.518247	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
7f953e25-0609-4d32-ae1f-044be95c7c10	ba30d5fc-30ea-4941-8a1a-3dead8a2fb85	\N	\N	2025-08-10 17:47:17.932095	2025-08-10 17:47:17.932095	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
eaf0ff1d-0831-434a-a1ac-1cd0b49fab17	ba30d5fc-30ea-4941-8a1a-3dead8a2fb85	\N	\N	2025-08-10 17:47:23.876319	2025-08-10 17:47:23.876319	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
fbcd8429-5ef0-469e-80d6-6cc4329a3803	ba30d5fc-30ea-4941-8a1a-3dead8a2fb85	\N	\N	2025-08-10 17:47:24.263053	2025-08-10 17:47:24.263053	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
ff39fb43-8942-41a9-87d6-685f27307bf6	ba30d5fc-30ea-4941-8a1a-3dead8a2fb85	\N	\N	2025-08-10 17:47:29.720994	2025-08-10 17:47:29.720994	sync_bitrix	Ошибка синхронизации с Bitrix24: undefined	{}
6d903601-9655-4ba8-8c16-4c75ad08db22	acdf8695-8c8d-473d-9605-7678b6947bde	42791e1c-fa78-44ae-aa2e-632226f460ab	\N	2025-08-10 17:51:55.793071	2025-08-10 17:51:55.793071	create	Заявка создана	\N
cae24100-998e-44ee-b24f-58d5a0247256	acdf8695-8c8d-473d-9605-7678b6947bde	\N	\N	2025-08-10 17:51:57.388129	2025-08-10 17:51:57.388129	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 19895)	{"bitrixDealId": "19895"}
e31f7983-be16-4731-8235-3bf73db565c6	acdf8695-8c8d-473d-9605-7678b6947bde	\N	\N	2025-08-10 18:00:52.692095	2025-08-10 18:00:52.692095	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
b83ba063-1238-402d-9fcf-dde076afbffd	acdf8695-8c8d-473d-9605-7678b6947bde	\N	\N	2025-08-10 18:00:58.072135	2025-08-10 18:00:58.072135	sync_bitrix	Ошибка синхронизации с Bitrix24: undefined	{}
810d4186-00eb-4c63-8423-d8cca1a89cc0	acdf8695-8c8d-473d-9605-7678b6947bde	\N	\N	2025-08-10 18:01:46.921716	2025-08-10 18:01:46.921716	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
163d59a0-1b5c-4791-a89f-ae3b7dbc62a5	acdf8695-8c8d-473d-9605-7678b6947bde	\N	\N	2025-08-10 18:01:47.643621	2025-08-10 18:01:47.643621	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
fa47f971-de30-4eeb-9705-754dcaf57ff0	e7be4010-7411-4e2a-a797-877560341e8f	42791e1c-fa78-44ae-aa2e-632226f460ab	\N	2025-08-10 18:02:06.965542	2025-08-10 18:02:06.965542	create	Заявка создана	\N
8d0df7e2-df9d-4761-9a92-a67c175c3620	e7be4010-7411-4e2a-a797-877560341e8f	\N	\N	2025-08-10 18:02:08.453412	2025-08-10 18:02:08.453412	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 19896)	{"bitrixDealId": "19896"}
51618e3d-5f28-437c-916f-11411c2f781c	858fb1d4-132c-41ec-8c13-1321a1167346	b07ba67b-3ab4-417e-9bcf-1b84efd57c99	\N	2025-08-14 14:31:47.434226	2025-08-14 14:31:47.434226	create	Заявка создана	\N
a38531e4-9163-4fed-a4b5-49980f69ed96	858fb1d4-132c-41ec-8c13-1321a1167346	\N	\N	2025-08-14 14:31:50.002042	2025-08-14 14:31:50.002042	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 19976)	{"bitrixDealId": "19976"}
37d704fe-3451-46e9-9ec6-6132b74e3f8e	bb7291b0-67d1-472a-8934-b06a7ad6b44d	b07ba67b-3ab4-417e-9bcf-1b84efd57c99	\N	2025-08-14 14:50:57.731603	2025-08-14 14:50:57.731603	create	Заявка создана	\N
38d49132-9514-4779-ab40-6859750e1f2b	bb7291b0-67d1-472a-8934-b06a7ad6b44d	\N	\N	2025-08-14 14:50:59.792787	2025-08-14 14:50:59.792787	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 19977)	{"bitrixDealId": "19977"}
1e0dc522-5ab8-4378-acb4-57bafd9292d3	bb7291b0-67d1-472a-8934-b06a7ad6b44d	\N	\N	2025-08-14 14:51:12.798028	2025-08-14 14:51:12.798028	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
cf54107f-73f0-4da0-8957-6ee5ce18829a	bb7291b0-67d1-472a-8934-b06a7ad6b44d	b07ba67b-3ab4-417e-9bcf-1b84efd57c99	[{"field": "title", "newValue": "NTCN12333", "oldValue": "NTCN123"}]	2025-08-14 14:51:17.849521	2025-08-14 14:51:17.849521	update	Заявка обновлена	\N
ee9ec779-acbf-4f6c-bae2-a7e6b5498235	bb7291b0-67d1-472a-8934-b06a7ad6b44d	\N	\N	2025-08-14 14:51:17.852633	2025-08-14 14:51:17.852633	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
83fa4884-eb43-47f7-8c4e-cb01e598e273	bb7291b0-67d1-472a-8934-b06a7ad6b44d	\N	\N	2025-08-14 14:51:18.274357	2025-08-14 14:51:18.274357	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
9dfe5c3c-2040-4fa5-a034-e47c21b58c2d	bb7291b0-67d1-472a-8934-b06a7ad6b44d	\N	\N	2025-08-17 14:43:45.311935	2025-08-17 14:43:45.311935	sync_bitrix	Ошибка синхронизации с Bitrix24: Request failed with status code 400	{"error": "Request failed with status code 400"}
07ecfabb-fd31-4e04-891a-635704fb3f89	858fb1d4-132c-41ec-8c13-1321a1167346	\N	\N	2025-08-17 14:43:50.756481	2025-08-17 14:43:50.756481	sync_bitrix	Ошибка синхронизации с Bitrix24: Request failed with status code 400	{"error": "Request failed with status code 400"}
e5b68030-6892-44f0-bb9c-f2d9d50b44f3	6ce7f06f-4f24-4f9c-bf41-fbde1358d273	b07ba67b-3ab4-417e-9bcf-1b84efd57c99	\N	2025-08-17 14:44:10.067764	2025-08-17 14:44:10.067764	create	Заявка создана	\N
727e6dd6-6236-4f1d-af5e-0afc21b0fcf7	6ce7f06f-4f24-4f9c-bf41-fbde1358d273	\N	\N	2025-08-17 14:44:12.056031	2025-08-17 14:44:12.056031	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20004)	{"bitrixDealId": "20004"}
0e7a7e3f-d0cb-4a1e-b865-14fdc311f3db	6ce7f06f-4f24-4f9c-bf41-fbde1358d273	\N	\N	2025-08-17 14:47:04.67487	2025-08-17 14:47:04.67487	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
600f3a99-561f-4df6-8cb0-30fa2bbd5371	6ce7f06f-4f24-4f9c-bf41-fbde1358d273	\N	\N	2025-08-17 14:47:12.571668	2025-08-17 14:47:12.571668	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
c7483d26-6843-4055-bb42-99fcd2adb23c	6ce7f06f-4f24-4f9c-bf41-fbde1358d273	\N	\N	2025-08-17 15:05:50.763713	2025-08-17 15:05:50.763713	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
ac691235-ac3d-4d50-9bcc-cea633043fd6	6ce7f06f-4f24-4f9c-bf41-fbde1358d273	\N	\N	2025-08-17 15:14:49.10864	2025-08-17 15:14:49.10864	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
8ee373bb-13e3-4b8d-95d4-cabc3634a9df	6ce7f06f-4f24-4f9c-bf41-fbde1358d273	\N	\N	2025-08-17 15:15:56.125424	2025-08-17 15:15:56.125424	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
829605c1-8334-493c-b93a-80c64575c85a	6ce7f06f-4f24-4f9c-bf41-fbde1358d273	\N	\N	2025-08-17 15:25:35.599977	2025-08-17 15:25:35.599977	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
aca0f965-c76e-47cf-9cb7-dd6b352fdf17	6ce7f06f-4f24-4f9c-bf41-fbde1358d273	\N	\N	2025-08-17 15:25:40.564874	2025-08-17 15:25:40.564874	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
ed197a58-b5f6-4ee5-8694-ad42fdd79b44	6ce7f06f-4f24-4f9c-bf41-fbde1358d273	\N	\N	2025-08-17 15:25:40.9422	2025-08-17 15:25:40.9422	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
278b351a-1eb4-4525-9a7d-d3dc35ecc595	6ce7f06f-4f24-4f9c-bf41-fbde1358d273	\N	\N	2025-08-17 15:37:16.875476	2025-08-17 15:37:16.875476	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
a56dc000-7211-422c-b96d-8e8799591f09	6ce7f06f-4f24-4f9c-bf41-fbde1358d273	\N	\N	2025-08-17 15:37:58.006931	2025-08-17 15:37:58.006931	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
7d00dfef-7156-4e53-b320-f7239e82027a	6ce7f06f-4f24-4f9c-bf41-fbde1358d273	\N	\N	2025-08-17 15:55:59.856336	2025-08-17 15:55:59.856336	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
23a02764-f12a-47a0-adef-6836f5d5db30	61aa7f9d-8107-4b2a-a89e-b8bfcb791a48	b07ba67b-3ab4-417e-9bcf-1b84efd57c99	\N	2025-08-17 16:04:44.098157	2025-08-17 16:04:44.098157	create	Заявка создана	\N
601e5073-ce37-440c-b8f3-475ba1379d54	61aa7f9d-8107-4b2a-a89e-b8bfcb791a48	\N	\N	2025-08-17 16:04:45.947511	2025-08-17 16:04:45.947511	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20005)	{"bitrixDealId": "20005"}
57451f21-673f-4a12-85a9-adcca5a11e26	f3042549-5ef0-41bf-9098-05a479895de9	b07ba67b-3ab4-417e-9bcf-1b84efd57c99	\N	2025-08-17 16:12:02.675294	2025-08-17 16:12:02.675294	create	Заявка создана	\N
3e07eb16-4aab-48f6-8fa2-422d63f10668	f3042549-5ef0-41bf-9098-05a479895de9	\N	\N	2025-08-17 16:12:04.434033	2025-08-17 16:12:04.434033	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20006)	{"bitrixDealId": "20006"}
38f111f2-9df7-4a75-ae7a-54f54fd3242d	f3042549-5ef0-41bf-9098-05a479895de9	\N	\N	2025-08-18 18:09:29.499539	2025-08-18 18:09:29.499539	sync_bitrix	Ошибка синхронизации с Bitrix24: Request failed with status code 400	{"error": "Request failed with status code 400"}
89055188-c6dd-4e20-82c2-8820554a6b2d	61aa7f9d-8107-4b2a-a89e-b8bfcb791a48	\N	\N	2025-08-18 18:09:43.399899	2025-08-18 18:09:43.399899	sync_bitrix	Ошибка синхронизации с Bitrix24: Request failed with status code 400	{"error": "Request failed with status code 400"}
eeed22f7-673f-48d6-b8f2-f530b5ffe952	a9b220b4-a7f7-4a09-8728-20b991b50db9	42791e1c-fa78-44ae-aa2e-632226f460ab	\N	2025-08-25 13:05:05.262571	2025-08-25 13:05:05.262571	create	Заявка создана	\N
ccbdc6b3-1fc7-4cfe-9a64-fd31db3fbe15	a9b220b4-a7f7-4a09-8728-20b991b50db9	\N	\N	2025-08-25 13:05:07.13167	2025-08-25 13:05:07.13167	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20138)	{"bitrixDealId": "20138"}
de3428df-dc57-4dc4-a53a-f7aae9376e91	a9b220b4-a7f7-4a09-8728-20b991b50db9	\N	\N	2025-08-25 13:05:35.969886	2025-08-25 13:05:35.969886	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
627db15e-08c2-4d4c-85ce-0026e1d7e06d	a9b220b4-a7f7-4a09-8728-20b991b50db9	\N	\N	2025-08-25 13:06:09.30093	2025-08-25 13:06:09.30093	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	{}
\.


--
-- Data for Name: submissions; Type: TABLE DATA; Schema: public; Owner: beton_user
--

COPY public.submissions (id, submission_number, form_id, user_id, title, status, priority, assigned_to_id, notes, tags, bitrix_deal_id, bitrix_category_id, bitrix_sync_status, bitrix_sync_error, form_name, form_title, user_email, user_name, created_at, updated_at, assigned_to_name, day_of_week, month_of_year, year_created, processing_time_minutes, data, form_data) FROM stdin;
2664a5d8-ab40-4ece-80ef-8342c914fa4a	202506155623	55c70b46-a204-4fd3-8e93-9abc078ab8aa	42791e1c-fa78-44ae-aa2e-632226f460ab	trstr3	C1:WON	medium	\N	\N	{}	17506	1	failed	Request failed with status code 400	form	Form	\N	\N	2025-06-15 12:14:16.914	2025-06-16 23:21:09.672	\N	\N	\N	\N	\N	\N	{}
36582ca9-269f-469a-8531-99777cb8b40c	202506155299	55c70b46-a204-4fd3-8e93-9abc078ab8aa	42791e1c-fa78-44ae-aa2e-632226f460ab	123445	C1:NEW	medium	\N	\N	{}	17509	1	synced	\N	form	Form	\N	\N	2025-06-15 12:19:14.295	2025-06-15 12:38:57.992	\N	\N	\N	\N	\N	\N	{}
ae7d1c00-ef99-4949-a715-43ef4da5ad6b	202506153283	55c70b46-a204-4fd3-8e93-9abc078ab8aa	a0b6d50b-32d7-4ff4-a562-578c15a4a669	Тестовая от Евгения	C1:NEW	medium	\N	\N	{}	17510	1	failed	Request failed with status code 400	form	Form	\N	\N	2025-06-15 13:13:43.415	2025-06-23 12:18:21.33	\N	\N	\N	\N	\N	\N	{}
1d69ecfa-f7ee-4f86-9eb5-d13549680543	202506156463	55c70b46-a204-4fd3-8e93-9abc078ab8aa	a0b6d50b-32d7-4ff4-a562-578c15a4a669	test Евгений34	C1:NEW	medium	\N	\N	{}	17511	1	failed	Request failed with status code 400	form	Form	\N	\N	2025-06-15 13:21:48.492	2025-06-22 18:12:48.181	\N	\N	\N	\N	\N	\N	{}
ca0715c4-9eec-40b2-964d-6908fbcb3e04	202506161674	55c70b46-a204-4fd3-8e93-9abc078ab8aa	42791e1c-fa78-44ae-aa2e-632226f460ab	test2	C1:NEW	medium	\N	\N	{}	17522	\N	synced	\N	form	Form	\N	\N	2025-06-16 10:29:04.236	2025-06-16 10:29:04.236	\N	\N	\N	\N	\N	\N	{}
9c0756e5-115e-4464-8d28-5641207702dd	202506164886	55c70b46-a204-4fd3-8e93-9abc078ab8aa	42791e1c-fa78-44ae-aa2e-632226f460ab	34	C1:NEW	medium	\N	\N	{}	17525	1	synced	\N	form	Form	\N	\N	2025-06-16 10:39:58.943	2025-06-16 10:39:58.943	\N	\N	\N	\N	\N	\N	{}
e64cbcd4-a2af-482f-a7d7-ae0263e39d00	202506172876	55c70b46-a204-4fd3-8e93-9abc078ab8aa	42791e1c-fa78-44ae-aa2e-632226f460ab	2025-06-13T00:06:00.000Z	C1:NEW	medium	\N	\N	{}	17579	1	synced	\N	form	Form	\N	\N	2025-06-17 00:09:06.655	2025-06-17 00:09:08.917	\N	\N	\N	\N	\N	\N	{}
79a675ff-572d-4c94-b06f-dc777b4a0fa5	202506179093	55c70b46-a204-4fd3-8e93-9abc078ab8aa	\N	Тестовая заявка с ID в Битрикс24	C1:NEW	medium	\N	\N	{}	17580	1	synced	\N	form	Form	\N	\N	2025-06-17 00:09:09.802	2025-06-17 00:09:11.054	\N	\N	\N	\N	\N	\N	{}
24b0fe33-37e4-4aab-a43a-c0c26bccb8f3	202506175420	55c70b46-a204-4fd3-8e93-9abc078ab8aa	42791e1c-fa78-44ae-aa2e-632226f460ab	2025-06-27T03:10:00.000Z	C1:WON	medium	\N	\N	{}	17581	1	synced	\N	form	Form	\N	\N	2025-06-17 00:10:07.404	2025-06-17 00:14:58.479	\N	\N	\N	\N	\N	\N	{}
505d84f5-7470-4d74-a327-96ea8ebfcb34	202506179278	55c70b46-a204-4fd3-8e93-9abc078ab8aa	\N	Проверка ID заявки	C1:NEW	medium	\N	\N	{}	17582	1	synced	\N	form	Form	\N	\N	2025-06-17 00:12:22.331	2025-06-17 00:12:23.881	\N	\N	\N	\N	\N	\N	{}
feb1ede4-e617-4d7e-a50a-e5d9425dd6ea	202506170787	55c70b46-a204-4fd3-8e93-9abc078ab8aa	\N	Проверка логов ID	C1:NEW	medium	\N	\N	{}	17583	1	synced	\N	form	Form	\N	\N	2025-06-17 00:13:05.601	2025-06-17 00:13:07.089	\N	\N	\N	\N	\N	\N	{}
ba30d5fc-30ea-4941-8a1a-3dead8a2fb85	202508108638	55c70b46-a204-4fd3-8e93-9abc078ab8aa	42791e1c-fa78-44ae-aa2e-632226f460ab	Тестовая заявка для проверки статуса2	C1:NEW	medium	\N	Заявка создана через форму	{}	19894	\N	failed	\N	1	2	crm@betonexpress.pro	\N	2025-08-10 17:30:06.153783	2025-08-10 17:47:29.719756	\N	0	8	2025	\N	\N	{}
5736d275-9583-4bff-8560-1ea50bc59186	202506167002	55c70b46-a204-4fd3-8e93-9abc078ab8aa	42791e1c-fa78-44ae-aa2e-632226f460ab	testret	C1:NEW	medium	\N	\N	{}	17549	1	failed	column "action_type" of relation "submission_history" does not exist	form	Form	\N	\N	2025-06-16 14:44:00.82	2025-08-10 15:13:54.051606	\N	\N	\N	\N	\N	\N	{}
e6b20f5b-45a7-46cd-802b-24ce9f92b4ff	202506230053	55c70b46-a204-4fd3-8e93-9abc078ab8aa	42791e1c-fa78-44ae-aa2e-632226f460ab	tester	C1:NEW	medium	\N	\N	{}	17774	1	failed	column "action_type" of relation "submission_history" does not exist	form	Form	\N	\N	2025-06-23 12:57:55.228	2025-08-10 15:21:42.940793	\N	\N	\N	\N	\N	\N	{}
f0a4abad-6ccd-4aff-b56b-8c82e165b8e6	202508107617	55c70b46-a204-4fd3-8e93-9abc078ab8aa	\N	Заявка 1754839621511	NEW	medium	\N	Заявка создана через форму	{}	\N	\N	pending	\N	1	2	\N	\N	2025-08-10 15:27:01.512006	2025-08-10 15:27:01.512006	\N	0	8	2025	\N	\N	{}
09073d81-3dde-4c95-b239-99ec4c692f9f	202508100601	55c70b46-a204-4fd3-8e93-9abc078ab8aa	\N	Заявка 1754840012124	NEW	medium	\N	Заявка создана через форму	{}	\N	\N	pending	\N	1	2	\N	\N	2025-08-10 15:33:32.125321	2025-08-10 15:33:32.125321	\N	0	8	2025	\N	\N	{}
acb864d5-85fa-4594-9824-2b1cb67040ca	202508103859	55c70b46-a204-4fd3-8e93-9abc078ab8aa	\N	Заявка 1754840076244	NEW	medium	\N	Заявка создана через форму	{}	\N	\N	pending	\N	1	2	\N	\N	2025-08-10 15:34:36.245669	2025-08-10 15:34:36.245669	\N	0	8	2025	\N	\N	{}
c77f3752-abd9-4559-92a8-3fdc79b5ab5e	202508104141	55c70b46-a204-4fd3-8e93-9abc078ab8aa	\N	Заявка 1754840104677	NEW	medium	\N	Заявка создана через форму	{}	19890	\N	synced	\N	1	2	\N	\N	2025-08-10 15:35:04.678221	2025-08-10 15:35:06.398369	\N	0	8	2025	\N	\N	{}
44362009-335e-4900-8ed5-445e39e76d71	202508104544	55c70b46-a204-4fd3-8e93-9abc078ab8aa	\N	Заявка 1754840979849	NEW	medium	\N	Заявка создана через форму	{}	19891	\N	synced	\N	1	2	\N	\N	2025-08-10 15:49:39.850341	2025-08-10 15:49:41.759488	\N	0	8	2025	\N	\N	{}
d357d934-12ae-453e-8a15-2b3e8e1d983e	TEST001	55c70b46-a204-4fd3-8e93-9abc078ab8aa	8cbf9eac-1eef-4afa-b998-a6fac83ae0e8	Тестовая заявка для копирования	C1:NEW	medium	\N	\N	{}	\N	\N	failed	Request failed with status code 400	form	Form	\N	\N	2025-06-23 13:01:09.524	2025-08-10 16:38:36.886137	\N	\N	\N	\N	\N	\N	{}
697e18a4-fd01-478f-a0a6-7a9d0e066371	202506173129	55c70b46-a204-4fd3-8e93-9abc078ab8aa	42791e1c-fa78-44ae-aa2e-632226f460ab	324	C1:NEW	medium	\N	\N	{}	17584	1	failed	Request failed with status code 400	form	Form	\N	\N	2025-06-17 00:15:44.254	2025-08-10 17:11:58.360744	\N	\N	\N	\N	\N	\N	{}
0e67527d-0ec7-4c14-8809-3e44b18f20cc	202508105215	55c70b46-a204-4fd3-8e93-9abc078ab8aa	42791e1c-fa78-44ae-aa2e-632226f460ab	213	NEW	medium	\N	Заявка создана через форму	{}	19892	\N	synced	\N	1	2	crm@betonexpress.pro	\N	2025-08-10 17:18:17.061942	2025-08-10 17:18:18.670329	\N	0	8	2025	\N	\N	{}
42812372-19e5-4a15-87a2-0594624ca962	202508103053	55c70b46-a204-4fd3-8e93-9abc078ab8aa	42791e1c-fa78-44ae-aa2e-632226f460ab	ТЕСТ	NEW	medium	\N	Заявка создана через форму	{}	19893	\N	synced	\N	1	2	crm@betonexpress.pro	\N	2025-08-10 17:18:56.893106	2025-08-10 17:18:58.506327	\N	0	8	2025	\N	\N	{}
e7be4010-7411-4e2a-a797-877560341e8f	202508108919	55c70b46-a204-4fd3-8e93-9abc078ab8aa	42791e1c-fa78-44ae-aa2e-632226f460ab	Тестовая заявка для проверки статуса567	C1:NEW	medium	\N	Заявка создана через форму	{}	19896	\N	synced	\N	1	2	crm@betonexpress.pro	\N	2025-08-10 18:02:06.960918	2025-08-10 18:02:08.449898	\N	0	8	2025	\N	\N	{}
acdf8695-8c8d-473d-9605-7678b6947bde	202508109386	55c70b46-a204-4fd3-8e93-9abc078ab8aa	42791e1c-fa78-44ae-aa2e-632226f460ab	Тестовая заявка для проверки статуса5	C1:NEW	medium	\N	Заявка создана через форму	{}	19895	\N	synced	\N	1	2	crm@betonexpress.pro	\N	2025-08-10 17:51:55.785461	2025-08-10 18:01:47.641179	\N	0	8	2025	\N	\N	{}
bb7291b0-67d1-472a-8934-b06a7ad6b44d	202508140353	55c70b46-a204-4fd3-8e93-9abc078ab8aa	b07ba67b-3ab4-417e-9bcf-1b84efd57c99	NTCN12333	C1:NEW	medium	\N	Заявка создана через форму	{}	19977	\N	failed	Request failed with status code 400	1	2	9311072175@betonexpress.pro	\N	2025-08-14 14:50:57.724267	2025-08-17 14:43:45.304697	\N	4	8	2025	\N	\N	{}
858fb1d4-132c-41ec-8c13-1321a1167346	202508146873	55c70b46-a204-4fd3-8e93-9abc078ab8aa	b07ba67b-3ab4-417e-9bcf-1b84efd57c99	ТЕСТ	C1:NEW	medium	\N	Заявка создана через форму	{}	19976	\N	failed	Request failed with status code 400	1	2	9311072175@betonexpress.pro	\N	2025-08-14 14:31:47.422787	2025-08-17 14:43:50.753702	\N	4	8	2025	\N	\N	{}
6ce7f06f-4f24-4f9c-bf41-fbde1358d273	202508175454	55c70b46-a204-4fd3-8e93-9abc078ab8aa	b07ba67b-3ab4-417e-9bcf-1b84efd57c99	ТЕСТТТ	C1:NEW	medium	\N	Заявка создана через форму	{}	20004	\N	synced	\N	1	2	9311072175@betonexpress.pro	\N	2025-08-17 14:44:10.057363	2025-08-17 15:55:59.850559	\N	0	8	2025	\N	\N	{}
61aa7f9d-8107-4b2a-a89e-b8bfcb791a48	202508174695	55c70b46-a204-4fd3-8e93-9abc078ab8aa	b07ba67b-3ab4-417e-9bcf-1b84efd57c99	ТЕСТТТ	C1:NEW	medium	\N	Заявка создана через форму	{}	20005	\N	failed	Request failed with status code 400	1	2	9311072175@betonexpress.pro	\N	2025-08-17 16:04:44.086412	2025-08-18 18:09:43.394472	\N	0	8	2025	\N	\N	{"field_1750265427938": "", "field_1750365626978": "", "field_1750365827152": "", "field_1750365852471": "", "field_1750365988007": "", "field_1750366113785": "", "field_1750417542374": "123", "field_1750672643963": "ТЕСТТТ", "field_1754560054970": "6137", "field_1754580171454": "", "field_1755172434743": "", "field_1755172588705": "", "divider_1750366418736": "", "Раствор завод": ""}
f3042549-5ef0-41bf-9098-05a479895de9	202508171160	55c70b46-a204-4fd3-8e93-9abc078ab8aa	b07ba67b-3ab4-417e-9bcf-1b84efd57c99	notch	C1:NEW	medium	\N	Заявка создана через форму	{}	20006	\N	failed	Request failed with status code 400	1	2	9311072175@betonexpress.pro	\N	2025-08-17 16:12:02.669827	2025-08-18 18:09:29.495869	\N	0	8	2025	\N	\N	{"field_1750265427938": "", "field_1750365626978": "", "field_1750365827152": "", "field_1750365852471": "", "field_1750365988007": "", "field_1750366113785": "", "field_1750417542374": "", "field_1750672643963": "notch", "field_1754560054970": "6118", "field_1754580171454": "", "field_1755172434743": "", "field_1755172588705": "", "divider_1750366418736": "", "Раствор завод": ""}
a9b220b4-a7f7-4a09-8728-20b991b50db9	202508254678	55c70b46-a204-4fd3-8e93-9abc078ab8aa	42791e1c-fa78-44ae-aa2e-632226f460ab	Тест	C1:NEW	medium	\N	Заявка создана через форму	{}	20138	\N	synced	\N	1	2	crm@betonexpress.pro	\N	2025-08-25 13:05:05.252662	2025-08-25 13:06:09.296922	\N	1	8	2025	\N	\N	{"field_1750265427938": "4423", "field_1750365626978": "", "field_1750365827152": "12", "field_1750365852471": "", "field_1750365988007": "", "field_1750366113785": "", "field_1750417542374": "", "field_1750672643963": "Тест", "field_1754560054970": "6058", "field_1754580171454": "", "field_1755172434743": "", "field_1755172588705": "", "field_1756126649357": "", "divider_1750366418736": "", "Раствор завод": "4384"}
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: beton_user
--

COPY public.users (id, email, password, first_name, last_name, phone, role, status, is_active, settings, bitrix_user_id, last_login, created_at, updated_at) FROM stdin;
abdd9df2-13d4-44a8-b896-a987b8762b71	a.zhirohova@betonexpress.pro	$2b$10$Qu4RdXLaoeo7YyCyTlz/2uYwaMSWTmGTbhCmaFtnH9nk/X/L/zKd6	Анастасия	Жирохова	\N	user	active	t	{}	9	\N	2025-06-14 10:35:32.804	2025-06-14 10:35:32.804
c7b0f747-4385-4166-96b0-6fb2bb3222ec	t.tyulkanova@betonexpress.pro	$2b$10$YwNzuGpGNaED9TWE7/Jz5.GOOl/xwvH.RaTKx1lEBVrv0HQ2KDmLG	Татьяна	Тюльканова	+79657625797	user	active	t	{}	10	\N	2025-06-14 10:35:32.856	2025-06-14 10:35:32.856
37729eb3-94ee-4f7e-8a38-efe45661b375	e.averkieva@betonexpress.pro	$2b$10$DI7QFfH.ppMHJyh51FevGOMjOB2x55PFvrU0ySt8Pttw1Gm2C0gTO	Екатерина	Аверкиева	\N	user	active	t	{}	18	\N	2025-06-14 10:35:33.267	2025-06-14 10:35:33.267
e6c6b558-c411-45c3-bcc0-e3350c8bac4e	v.cherkasova@betonexpress.pro	$2b$10$FL9pkO/HzlmEKaveuorTzO/LyXpcwdjf8rFglJR4/2fsTWySvidEO	Валерия	Черкасова	\N	user	active	t	{}	27	\N	2025-06-14 10:35:33.728	2025-06-14 10:35:33.728
ba9d694a-951f-4ad7-ba40-db42d6809487	i.dyudikova@betonexpress.pro	$2b$10$MR00trxExOHwilezks1/J.iAIJKMJ8ZJPuHf8U1ZcjmRNBPITnaR.	Ирина	Дюдякова	\N	user	active	t	{}	41	\N	2025-06-14 10:35:34.337	2025-06-14 10:35:34.337
7ecb4e6c-08cb-415d-958b-184b2f89794d	t.grigoreva@betonexpress.pro	$2b$10$LfM1RQTgqUyWq0eEPtpo8OZO5ETlIsCmQW7rGkCD84DxyqWXBwkny	Татьяна	Григорьева	+79119027226	user	active	t	{"onlyMyCompanies": true}	8	2025-08-18 17:37:40.659	2025-06-14 10:35:32.753	2025-08-18 17:37:40.659989
3708e3d2-8978-4d07-b2ee-6f11e5f40078	beton@betonexpress.pro	$2b$10$A63SV2.fcC2mYgV1Ujk.euOD/u5zFMRAf/EuuytttS6DFrADFoCAi	\N	\N	\N	user	active	t	{}	4	\N	2025-06-14 10:35:32.55	2025-08-11 14:40:27.744177
f54f9ac1-0f4b-42b2-9fa4-9a4bccb4bfa6	a.gushchina@betonexpress.pro	$2b$10$2FEWO22IdwRZjSg01BSzF.P6Z1ouZ0vIQwhPAJvYEs951PXpGWo4G	Анастасия	Гущина	89692064063	user	active	t	{}	13	\N	2025-06-14 10:35:33.014	2025-08-11 14:40:27.778478
dd82f062-a230-4d08-a44d-44a185b885ad	s.fedorova@betonexpress.pro	$2b$10$qiaioH0uoKvPvME7typ.nOwu2Y9sGMunoG5a.m1DeFenCg74dMNQS	Светлана	Федорова	\N	user	active	t	{}	43	\N	2025-06-14 10:35:34.389	2025-06-14 10:35:34.389
490797ce-62a3-448b-9673-d13fb6d62bc3	a.yakovlev@betonexpress.pro	$2b$10$JLofgm3r8rLPLZGLMxYLPOVbQIHwVqgPxcw2K3TaPng.YVTj9qto.	Александр	Яковлев	\N	user	active	t	{}	44	\N	2025-06-14 10:35:34.44	2025-06-14 10:35:34.44
9153641e-cbe2-4d4f-b000-7bfc51bf3467	m.shurigina@betonexpress.pro	$2b$10$FJFtg4Bh71S2Ddd4Id845ezUeswYpQ5MPkicINbkL5f0BDg8pLj1.	Марина	Шурыгина	\N	user	active	t	{}	45	\N	2025-06-14 10:35:34.489	2025-06-14 10:35:34.489
12ddbae1-4082-472f-b800-57515a977f2a	d.drozhzhina@betonexpress.pro	$2b$10$ba18jJpslgLQR7MPUOQO6uxUe.h4G7odlxwnLZGf1SFnNIe.p1eMK	Дарья	Дрожжина	\N	user	active	t	{}	46	\N	2025-06-14 10:35:34.541	2025-06-14 10:35:34.541
60750e33-aeb4-4919-8359-873a8f505954	a.oshnurova@betonexpress.pro	$2b$10$uOfojnx/mMZR/PN.lqxUj.skbdvJf0mADxVBiAxefhUivwxE66bSG	Анна	Ошнурова	\N	user	active	t	{}	47	\N	2025-06-14 10:35:34.591	2025-06-14 10:35:34.591
1c46e602-6e2e-42b0-887d-b0d850be1573	s.larionova@betonexpress.pro	$2b$10$MO1c7/wHZ4S.0mXg6.y0hOjddoXDutNbj41zmqLYVv.b1Bj4NRy2W	Светлана	Ларионова	\N	user	active	t	{}	49	\N	2025-06-14 10:35:34.691	2025-06-14 10:35:34.691
5c2e2b55-c985-43d9-8ba2-201da125343a	i.kobeleva@betonexpress.pro	$2b$10$9s2BScvvpKHeVpDhLHtcL.NmuYkAFuPN2khFKm1a8JNAR8VPwzDBq	Ирина	Кобелева	\N	user	active	t	{}	52	\N	2025-06-14 10:35:34.842	2025-06-14 10:35:34.842
1347bea9-ebe0-4b1d-b4f7-fb8d46677c0b	d.ginnatulina@betonexpress.pro	$2b$10$0cSKV3usYcfHLJblkAYttOsR3y09yCApnF6FBSlVENPfOcP548Mpq	Дарья	Гиннатуллина	\N	user	active	t	{}	54	\N	2025-06-14 10:35:34.943	2025-06-14 10:35:34.943
21ef06b3-d243-47e6-9977-d68fcdd5c8e8	user@betonexpress.pro	$2b$10$ACKm7GJ8cxfBrbvueHyZW.odRsGhha0Q8nXolzu6pJ8jbzIPXIY1G	Тест	Пользователь	+7 (999) 123-45-67	user	active	t	{}	\N	\N	2025-06-14 11:00:15.027	2025-06-14 11:00:15.027
21a6f942-8d3c-472d-a6fd-f59ead496899	a.ginnatullin@betonexress.pro	$2b$10$9tVoH7PKtkDU2J8deF6jcO344M2kNpfHrEiFApEdzh6r0vvhw.oSe	Артём	Гиннатуллин	\N	user	active	t	{}	64	\N	2025-06-15 10:47:12.225	2025-06-15 10:47:12.225
73962099-d781-4e68-ad98-9a15a4fde36f	kozakova@betonexpress.pro	$2b$10$upjRTarGChPVdCJPPeAa1O8TQx0spoOZfDaVnEhDv0WncJBDGd4zi	Наталья	Козакова	\N	user	active	t	{}	62	\N	2025-06-15 10:47:13.002	2025-06-15 10:47:13.002
ec0e5a8c-0cfb-431a-9dca-5427cd8b0ad9	449-27-75@mail.ru	$2b$10$cXmziiG3EHwfUvcb8vaTiuvUPxm.tbzcPQf0L5z2IhBrFYxnE99mu	Мария	Мейрович	8 (812) 456-90-30	user	active	t	{}	\N	\N	2025-06-15 10:47:12.893	2025-06-15 10:47:12.893
8cbf9eac-1eef-4afa-b998-a6fac83ae0e8	test@betonexpress.pro	anotherattempt999	Тест	Пользователь	1	user	active	t	{"onlyMyCompanies": true}	\N	\N	2025-06-23 11:56:34.743	2025-08-11 19:00:51.527847
8f5b8f4c-f6eb-4254-b4dd-fee6226bde3c	buh@beton-x.ru	$2b$10$4VVXP3Zr.q6Q7dxt85AEq.tchntNbz/7/GpzY8y0vHizGb4YoDveC	Мария	Мейрович	8 (967) 561-39-82	user	active	t	{}	57	\N	2025-08-11 14:40:27.839402	2025-08-11 14:40:27.839402
6846fb6c-1d62-4eaa-97fc-3cfe9792d5db	8-968-182-88-55@mail.ru	$2b$10$8Qo80KsIyBRg9bIuQ5TM2edY82HMq0.8RKMyxd0DrAOzzlrV5w5aK	Пётр	Лебедев		user	active	t	{}	79	\N	2025-08-11 14:40:27.90609	2025-08-11 14:40:27.90609
5425da2c-7e9f-4f2f-bcde-a92b24365580	roman@optispb.ru	$2b$10$Nl79OsUiXWR.Hyi/wD8vZe7hLFQWWZH/EdpmlPFhYK3iPvohN8c7u	Системный Администратор	Роман Марков	+7-921-916-0981	user	active	t	{}	69	\N	2025-08-11 14:40:27.960215	2025-08-11 14:40:27.960215
b1e54fb8-a5ee-4681-be78-d34e7e44d0c7	a.gazizov@betonexpress.pro	$2b$10$3gWRO6uhVDDTBS23EKdHke0PL6NWKV5qwAej09WaHSuwnWQl6IOLu	Адиль	Газизов	\N	user	active	t	{}	50	\N	2025-06-14 10:35:34.742	2025-08-11 14:40:27.760331
cb9ba966-baf5-4d52-91b6-a11bebae9145	tvtylibtseva@gmail.com	$2b$10$Jpvjb/IrXaAQ3ssmw.Xt/O2dtY6vvxx.sg5BSd1cLL.91uWam3OYG	Татьяна			user	active	t	{}	123	\N	2025-08-11 14:40:28.013141	2025-08-11 14:40:28.013141
bf23b4ad-1e2d-40f9-96b7-29635a6bb9d6	support@mail.ru	$2b$10$6hgDIpL2on.gVsdoQ8LbEu93zOp2ue6cTFnSmJmLsAAgodtvc9R0.	техподдержка	битрикс		user	active	t	{}	72	\N	2025-08-11 14:40:28.058165	2025-08-11 14:40:28.058165
e10509a7-f6ce-4e0b-a20d-653c055280ad	distsh@betonexpress.pro	$2b$10$iBhilOWKRmVxupqITnq8reZmJUhOQWdZ.EEdL8KUlD/LnIWcMONwy	ТШ	Диспетчер		user	active	t	{}	106	\N	2025-08-11 14:40:28.102412	2025-08-11 14:40:28.102412
3a5af16b-e597-4b26-89eb-50961c0a6fab	labtsh@betonexpress.pro	$2b$10$MVsUopnL51Gtp/D8UsxgluAIfujL5YihKzrXVSdvbOcXsO7lCKbXS	ТШ	Лаборант		user	active	t	{}	109	\N	2025-08-11 14:40:28.14667	2025-08-11 14:40:28.14667
11a2856b-59a3-42fb-9e0e-265ccf4050e9	yakovenko@betonexpress.pro	$2b$10$2939PZ569ab5oxhwmNo3DuWT5U0woZeIocqV.Kz3HwiNA6mwqaqJy	Яковенко	Екатерина		user	active	t	{}	61	\N	2025-08-11 14:40:28.238062	2025-08-11 14:40:28.238062
b07ba67b-3ab4-417e-9bcf-1b84efd57c99	9311072175@betonexpress.pro	$2b$10$ggASpOWS2j5ORldcSPq8S.YfpDbmSQCEOH5Kes4sCynoLYHNylLke	Сергей	Банщиков	+79311072175	user	active	t	{"onlyMyCompanies": false}	34	2025-08-18 18:40:08.261	2025-06-14 10:35:34.083	2025-08-18 18:40:08.262877
b7424363-61ae-4ce4-80b5-dbe0e00bad07	n.kashtanov@betonexpress.pro	$2b$10$8SJYynnPSu0LVROe3JG4f.6QoEnz0JeRu15vu5j6kzuDJM/UzGYFa	Никита	Каштанов	+79311072036	user	active	t	{"onlyMyCompanies": true}	36	2025-08-11 19:06:31.567	2025-06-14 10:35:34.184	2025-08-11 19:06:31.568542
80c91a5f-a31a-4225-932a-d4876c958590	131085dana@mail.ru	$2b$10$KcAiMxLG9ah2RnpckCadsudcUZNISLgdM7SSRqMLRNuKVob7JZe7S	Юля	Шамарова		user	active	t	{"onlyMyCompanies": true}	76	2025-08-11 19:07:08.307	2025-08-11 14:40:28.194782	2025-08-11 19:07:08.307939
2a994740-f10e-4feb-84ab-2ec5b3e26169	v.belogorskiy@betonexpress.pro	$2b$10$XKW0QhSc/O3pYctOHfjarunPaH8CshFeSFqRjYtyFxYPy7CyOFlzq	Вадим	Белогорский	\N	user	active	t	{}	38	\N	2025-06-14 10:35:34.286	2025-08-11 14:40:27.795123
f7411c62-4d64-4011-8de9-ac5c6e38fc8f	v.shamarova@betonexpress.pro	$2b$10$oFQCrNThwQyLJRXNNeZR4.lMosGC2uCurwFs6XngLtVBrGwsry8T6	Валерия	Шамарова	+79117858588	user	active	t	{}	19	\N	2025-06-14 10:35:33.318	2025-08-11 14:40:27.797838
0d80111c-3886-4356-8fcf-12b731738090	v.bondarenko@betonexpress.pro	$2b$10$XYaF2btm33rur.0/ogPpGeBpGch2bkdKPjG.LpUQJOn5D/GvNh.T.	Виктория	Бондоренко	+7 911 12 999 12	user	active	t	{}	16	\N	2025-06-14 10:35:33.166	2025-08-11 14:40:27.800843
193bafa4-49de-49bd-b943-e2c55530dc6f	g.pludovskiy@betonexpress.pro	$2b$10$pfvvIKRkxNKX59fGuWvOj.iKQZfxK1.LPTmFoz38zt23xnYn/zF56	Геннадий	Плудовский	\N	user	active	t	{}	25	\N	2025-06-14 10:35:33.624	2025-08-11 14:40:27.810208
0fa040f0-0a03-41e3-8bbb-7692558f0891	d.moshkov@betonexpress.pro	$2b$10$u6CKJFAUZXveAPMeE2J8kuI04JYYKw0ep099QzoUB2RTwYWVqu/Lm	Дмитрий	Мошков	\N	user	active	t	{}	5	\N	2025-06-14 10:35:32.601	2025-08-11 14:40:27.816414
a0b6d50b-32d7-4ff4-a562-578c15a4a669	roughriver@ya.ru	$2b$10$/6TyO1jJBoLr54znsZ.k1.GyRbfonF.QmdOPikxu/zqobjAg00HHS	Евгений	Шикунов	\N	user	active	t	{}	3	\N	2025-06-14 10:35:32.496	2025-08-11 14:40:27.818576
8238f720-7842-4051-a500-50c168071617	e.vasenev@betonexpress.pro	$2b$10$T0X84EtdxnXlcMDuUgqJRO3WH8lBjXEZDWXLbmDLIKaJApYIAWDeS	Евгений	Васенев	\N	user	active	t	{}	29	\N	2025-06-14 10:35:33.83	2025-08-11 14:40:27.823006
466148e5-23ee-47b8-953f-9155f5c6ecc8	e.kondakova@betonexpress.pro	$2b$10$x.b5Z8NoKZqPPExSHAETmeX03TyU/iIG557fJSK5OYW2EuJk9gWG2	Екатерина	Кондакова	+79675613982	user	active	t	{}	11	\N	2025-06-14 10:35:32.91	2025-08-11 14:40:27.825119
5540380d-1d5f-4d0d-bc63-8200ae0669dd	e.zholtko@betonexpress.pro	$2b$10$LWTm6hGq4fdE9QDPcK2Ti.jOBlqQMVPz8rDVBubOq2hfOjEOyUXAC	Елена	Жолтко	\N	user	active	t	{}	20	\N	2025-06-14 10:35:33.368	2025-08-11 14:40:27.831974
529257a4-8a29-4587-a83d-f3f1374f1228	i.egorov@betonexpress.pro	$2b$10$HeIW.BT6AJSIfkCgAIhM/eVVytnJ5x/vYxuh92qkm774FpaioXP0m	Илья	Егоров	+79095933432	user	active	t	{}	22	\N	2025-06-14 10:35:33.469	2025-08-11 14:40:27.835945
8430e559-cdac-4243-8ead-b1284d72104d	k.erofeev@betonexpress.pro	$2b$10$obShntQSbY0ie8aZNuY8BO8E4HC5MsLN8mZSx56e.CcT4yatmYlo2	Кирилл	Ерофеев	89697272735	user	active	t	{}	14	\N	2025-06-14 10:35:33.065	2025-08-11 14:40:27.83783
ad88abac-caef-4577-acc4-8e989fdb429d	n.petrochenko@betonexpress.pro	$2b$10$Y5UxDg2/ZsCUZn6dUX0MXeDKUuH1WZfFHHRxFfCPtrjypxW6HAYwO	Надежда	Петроченко	89633202909	user	active	t	{}	7	\N	2025-06-14 10:35:32.702	2025-08-11 14:40:27.888836
d60d0486-c76d-4dac-aa75-a1e474f0a4e1	n.ganshu@betonexpress.pro	$2b$10$OS7rxgmfUxZ46eMhLJxhb.sIYfpP2t03Fuv9bRNkSx/4DZO1Q3/na	Наталья	Ганшу	8 965 762 37 16	user	active	t	{}	12	\N	2025-06-14 10:35:32.963	2025-08-11 14:40:27.891362
4619995b-f010-4f52-ac0c-68f27dd68aa9	n.metreveli@betonexpress.pro	$2b$10$bb1cRMQrop0Z/3FUx4zQPuilF92FbxpXH5aQsRBjYRa5Eyj3nUjTO	Наталья	Метревели	89818950699	user	active	t	{}	23	\N	2025-06-14 10:35:33.519	2025-08-11 14:40:27.895998
8751d7e8-6202-4447-9986-34653956bc93	n.chelyuskin@betonexpress.pro	$2b$10$mTbW.1/ITsQhimCF7Ss77.UsMAOTO9KrVMP8ItqMB8ujjvn/fwm26	Никита	Челюскин	\N	user	active	t	{}	6	\N	2025-06-14 10:35:32.651	2025-08-11 14:40:27.89992
0d890b3e-be02-4ff1-a90c-b43552911e16	n.chizhov@betonexpress.pro	$2b$10$MnBWIjCtFPnEcV0YRSSmHeZLcHRyZ5./NQSahv71HAsXJcKnSi61y	Николай	Чижов	\N	user	active	t	{}	28	\N	2025-06-14 10:35:33.779	2025-08-11 14:40:27.902351
cb3d45c9-e7c0-4fb5-801c-a434441af6c5	sales@betonexpress.pro	$2b$10$Ik8iOCFAQd3jnPIuW8iI2eRlUkDZ7nyzqirfXrm0z92BN4BXJeE0i	Отдел продаж - общий ящик	\N	\N	user	active	t	{}	31	\N	2025-06-14 10:35:33.931	2025-08-11 14:40:27.904543
be3ea46e-6664-4ecf-82a3-a9ff8f28a2ee	r.orlova@betonexpress.pro	$2b$10$8OKgUCyYpvHtbTNWo3kLJeKJZ0PNML7AI9EhyobGyeKFxzijG7s9i	Рената	Орлова	\N	user	active	t	{}	26	\N	2025-06-14 10:35:33.675	2025-08-11 14:40:27.949819
b9291ac2-9435-4bad-b4c9-55c1919bb91d	s.sivkov@betonexpress.pro	$2b$10$6URKgwlNA8dOJFFx.MF1fOt4k6dbBV.HR//PzfqQcUKhsu3TpNB0i	Сергей	Сивков	\N	user	active	t	{}	37	\N	2025-06-14 10:35:34.234	2025-08-11 14:40:27.951667
99d05406-28a0-46b2-9896-f1ac93afd3e8	s.berdinskih@betonexpress.pro	$2b$10$Xp9/x17.RnsAPGNy3UPz2eOkD4g0O4MRTrbrF/sTWTAXa..qnFJia	Сергей	Бердинских	\N	user	active	t	{}	32	\N	2025-06-14 10:35:33.981	2025-08-11 14:40:27.95509
14d085a3-803d-4eaf-a196-d7fe81016b41	s.knyazev@betonexpress.pro	$2b$10$ZPFO4KokUswjmdjCVbdVh..I2IuommJryuftLj2Zgo8R4BdTmedZy	Сергей	Князев	\N	user	active	t	{}	30	\N	2025-06-14 10:35:33.88	2025-08-11 14:40:27.95691
274f575a-d01e-4493-bc7f-3efc55334494	vss_ask@mail.ru	$2b$10$b4T8ae24Fl.8xb.8LXT5qOGMxKY/4Sdl8kjD5qziODvVh0D1dnEYu	Сергей	Вигуль	\N	user	active	t	{}	17	\N	2025-06-14 10:35:33.217	2025-08-11 14:40:27.958873
7b686a85-6f14-4760-8ad3-e354b8b5866f	t.lichman@betonexpress.pro	$2b$10$ebKEEwbNL9gfsYHSiZzFneE5CjQK7WIhj9hwXStANwAz1asWoTSmO	Татьяна	Личман	\N	user	active	t	{}	24	\N	2025-06-14 10:35:33.57	2025-08-11 14:40:28.00761
6efc44f0-29a8-4063-a999-dd48f7b5eb81	t.stepanova@betonexpress.pro	$2b$10$/3g4iw/GJr92uejxUloEQuPymWdvw6hWPc5tALXxzgJqxLgZjJ2z6	Татьяна	Степанова	\N	user	active	t	{}	21	\N	2025-06-14 10:35:33.419	2025-08-11 14:40:28.010925
d1113e0f-53c0-4c8a-8a56-ea022353e200	u.persidskaya@betonexpress.pro	$2b$10$xE8PR9fQsCdXz.qqkfl0bOyWEI5SS9IsmaUzdcw6DhqHivTNowyti	Ульяна	Персидская	89062487636	user	active	t	{}	15	\N	2025-06-14 10:35:33.115	2025-08-11 14:40:28.190942
42791e1c-fa78-44ae-aa2e-632226f460ab	crm@betonexpress.pro	$2b$10$VHxWWlQGgJ85XMo2ztPi5OQnQ6wnG9OxGJ1.RSjI1fH8a/984d0ge	crm	Administrator		admin	active	t	{"onlyMyCompanies": true}	1	2025-08-18 19:12:33.925	2025-06-14 10:54:17.723	2025-08-18 19:12:33.926373
1039c0f9-1707-4e52-9611-eee71482aac5	y.papko@betonexpress.pro	$2b$10$rkMcL7cN.q9PlXqibb44ZO1fUNF4Vr8D3kk2oEavFiknXvkOuvaEO	Юлия	Папко	+79311072033	user	active	t	{}	35	\N	2025-06-14 10:35:34.133	2025-08-11 14:40:28.193185
6645999c-619c-4662-9daf-2015dc1767e2	a.isakov@betonexpress.pro	$2b$10$j4xtUgmdaGixlknHS1vQauF7sJ2x4R3grpo.x5beWc2ZitohojMK6	Алексей	Исаков	+79310019880	user	active	t	{}	33	\N	2025-06-14 10:35:34.033	2025-08-11 14:40:27.764969
578720fb-1870-438b-b287-a53ee7137e5f	9319589800@betonexpress.pro	$2b$10$SUdW2GK6uFxlEzuB1Lr7AeSB1UFZgLNPK6klD2CZBhOkfpnXlOaaO	Анастасия	Воркова	+7-931-958-98-00	user	active	t	{}	83	\N	2025-06-15 10:47:12.098	2025-08-11 14:40:27.769986
c55a3380-c93c-4553-9de3-27567d157200	a.merkuryeva@betonexpress.pro	$2b$10$DYwLR7EqXIU5CwZ/CZTdsunbXvSvaj0U00/aegrOIi8FgkgcROSRS	Анастасия	Меркурьева	\N	user	active	t	{}	51	\N	2025-06-14 10:35:34.792	2025-08-11 14:40:27.774338
d5af50b7-f809-4ea4-80b8-757e2711a8b0	89626868122@mail.ru	$2b$10$VqrbmsMw5kkuS7pGVHulH.pQdXSJNvySMN1w5lMQ4TinqUsTNLEry	Анна	Голубенко	\N	user	active	t	{}	75	\N	2025-06-15 10:47:12.169	2025-08-11 14:40:27.783211
aa4bf9ab-45a6-4aca-a38a-b66a22f900c8	a.golubenko@betonexpress.pro	$2b$10$bn8bUdX/6jfXncVxFd.AX.51Xt1ejZqfSX3YK/b8Xm59StbNR1Yju	Анна	Харламова	\N	user	active	t	{}	48	\N	2025-06-14 10:35:34.642	2025-08-11 14:40:27.786354
519609b7-739d-46d4-a180-b57f2bd191f5	disbo@betonexpress.pro	$2b$10$LryZ/N1fre70uPoY3fIW/.jfVIVz4U6pAvH5FywNSCkGPYpPXiQBy	БО	Диспетчер	\N	user	active	t	{}	104	\N	2025-06-15 10:47:12.278	2025-08-11 14:40:27.789693
df288032-bc85-436b-be5b-919649547df3	labbo@betonexpress.pro	$2b$10$5M1c23HysEhtIjym8Z.Rru7wJb2G6oAFyyNgshe2Wiz4Bs44MJPEq	БО	Лаборант	\N	user	active	t	{}	107	\N	2025-06-15 10:47:12.331	2025-08-11 14:40:27.792468
58e54349-7757-4a40-a06e-1041d6917f39	spbviolet@mail.ru	$2b$10$.FSsulb50m0RZjNbASHiHeGl6wAZo4mT5UMw1.b34XheHvHhU2TqK	Виолетта	Лунгу	\N	user	active	t	{}	78	\N	2025-06-15 10:47:12.39	2025-08-11 14:40:27.803199
6207890d-83c0-4356-9a92-ec8418e53e57	labvsh@betonexpress.pro	$2b$10$DuB1SEjClYEwMvjwqxyByOKtf0QobdGrkkMNwZRhn2sANZgq41Ps6	ВШ	Лаборант	\N	user	active	t	{}	108	\N	2025-06-15 10:47:12.497	2025-08-11 14:40:27.80542
56f89161-0645-41f0-8c45-bb4f9a44b98d	disvsh@betonexpress.pro	$2b$10$QnziIxyWnSYEFuVd.BWrxeSRsWoDi1jVF5bH7aV6vyxwwu3.KlR7G	ВШ	Диспетчер	\N	user	active	t	{}	105	\N	2025-06-15 10:47:12.443	2025-08-11 14:40:27.807843
88d189b1-3ac6-4791-b66b-c8197357a3e0	dmahaeva@mail.ru	$2b$10$0LoxHKKXpZ5EpzPlghvi2ONdihsTpJ5G13WxMMxAL.AMu7zaSOM0e	Диана	Махаева	+7(911) 798-39-61	user	active	t	{}	118	\N	2025-06-15 10:47:12.557	2025-08-11 14:40:27.812455
e0e5361c-9ec4-4cc6-8bdd-8fdf1e142977	ekdm85@xmail.ru	$2b$10$b.o40X.ic8mvv1qUBlECYe058ZptRodgQ1Mhf3gHkewm823A7X6Mq	Дмитрий	Екимов	\N	user	active	t	{}	58	\N	2025-06-15 10:47:12.612	2025-08-11 14:40:27.81467
6a4ce2d4-a5f6-4802-b6f8-c635f388d6a7	yevgeniy_aleksandrovich_1988@inbox.ru	$2b$10$tHuXGLqyFztwKAILJxvDx.cwkNneyDH5onuy7/BA.4jWfyQUkCsna	Евгений	Кадаяс	\N	user	active	t	{}	74	\N	2025-06-15 10:47:12.669	2025-08-11 14:40:27.820666
c98e44c0-e477-40bc-a8e6-9eeb635ffa85	e.churakova@betonexpress.pro	$2b$10$3MMEyvwN9CjLteQlvFITrOehJnziv3jHHZ9hdRorUeU/hz9nsbYJq	Екатерина	Чуракова	\N	user	active	t	{}	120	\N	2025-06-15 10:47:12.726	2025-08-11 14:40:27.826886
256ddeaa-2cd1-4dc2-9ab6-baad01a5e515	e.zeleneva@betonexpress.pro	$2b$10$uq2ZBrG8QLfL1YRYcibINOZYKuBa/.e1usP3HJIk.b2LtQgs/wpVa	Екатерина	Зеленева	\N	user	active	t	{}	53	\N	2025-06-14 10:35:34.893	2025-08-11 14:40:27.828486
874a98b6-1ccf-4101-a79c-672e5da8b7c2	9313920900@betonexpress.pro	$2b$10$D6Di6UwdH6UeYv7pxsI07.GuzWqs6F54WaNC5jqTgTvHQP1qIR1Yi	Елена	Грибанькова	+79313920900	user	active	t	{}	82	\N	2025-06-15 10:47:12.779	2025-08-11 14:40:27.830292
969a8bd4-7974-4bc5-b76e-fb77ae48c899	i.eremenko@betonexpress.pro	$2b$10$ZrAMbJXyTeTQW.w3zf6pa.d49e0agMso42cQDMbOsucF7v9qM4/6.	Игорь	Еременко	\N	user	active	t	{}	63	\N	2025-06-15 10:47:12.832	2025-08-11 14:40:27.833797
72fcea08-df75-4565-afcc-7b59d03384d0	m.soloviv@yandex.ru	$2b$10$yxZ33RRsP9Oeli4kMWB2iOOAtQAUCHcTAE3VV.Ucasv7qoY7yfwIy	Михаил 	Соловьев	\N	user	active	t	{}	80	\N	2025-06-15 10:47:12.944	2025-08-11 14:40:27.886484
e5df0690-3f53-4ac9-848a-3fed04d9a991	nataly77@mail.ru	$2b$10$9jVAkrKGZFl8Q2tK5H5yQOfk/0Gsm2n3UQ9y.bpWojMoAB/Epa04y	Наталья	Аманова 	\N	user	active	t	{}	77	\N	2025-06-15 10:47:13.055	2025-08-11 14:40:27.893999
eef54264-5228-494b-ad33-4d85c64ca9af	rep@betonexpress.pro	$2b$10$cRND3IxXABXoROApitmII.vDFZ.S/cp8zR86xhRviQs6/yjmUwQji	Альберт	Репсон	\N	user	active	t	{}	168	\N	2025-08-18 19:03:53.414424	2025-08-18 19:03:53.414424
ec063948-bdc2-442b-873e-c9091ad9c661	ginn@betonexpress.pro	$2b$10$J9xSKk6e7zGeNg5VLDnGgeXDh8pnqCGHP2skp.nv2WdvExD7izFOi	Артем	Гиннатулин	\N	user	active	t	{}	172	\N	2025-08-18 19:03:53.484414	2025-08-18 19:03:53.484414
5268bb46-fc32-4068-a7e0-d7761d22b6d0	ring@betonexpress.pro	$2b$10$tllBalqeKELVjOg6kAn3Veer/m8o.XsN8HUlyuRIwZazwKDuwvdnm	Виктория	Ринг	\N	user	active	t	{}	171	\N	2025-08-18 19:03:53.531916	2025-08-18 19:03:53.531916
7239ac4a-4401-4737-8ec6-c32abced1bb0	pros@betonexpress.pro	$2b$10$Vi1dmPXjdO3/1ook/GD.xeu3KztKQHCkLAaCke7KRFdk2pOFoL3VO	Дмитрий	Проскурин	\N	user	active	t	{}	170	\N	2025-08-18 19:03:53.579429	2025-08-18 19:03:53.579429
17610094-59b9-4ac9-88d7-cfa7cbb8c7c6	zin@betonexpress.pro	$2b$10$uOxt8g14y/7x6Tjoq4OqIOSJKsgd3i4u3kSiBYoQHj/galNgi5yBO	Надежда	Зинкевич	\N	user	active	t	{"onlyMyCompanies": true}	169	2025-08-18 19:15:28.979	2025-08-18 19:03:53.62802	2025-08-18 19:15:28.979959
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: beton_user
--

SELECT pg_catalog.setval('public.migrations_id_seq', 1, false);


--
-- Name: admin_tokens admin_tokens_pkey; Type: CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.admin_tokens
    ADD CONSTRAINT admin_tokens_pkey PRIMARY KEY (id);


--
-- Name: admin_tokens admin_tokens_token_key; Type: CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.admin_tokens
    ADD CONSTRAINT admin_tokens_token_key UNIQUE (token);


--
-- Name: form_fields form_fields_pkey; Type: CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.form_fields
    ADD CONSTRAINT form_fields_pkey PRIMARY KEY (id);


--
-- Name: forms forms_name_key; Type: CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.forms
    ADD CONSTRAINT forms_name_key UNIQUE (name);


--
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: submission_history submission_history_pkey; Type: CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.submission_history
    ADD CONSTRAINT submission_history_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_submission_number_key; Type: CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.submissions
    ADD CONSTRAINT submissions_submission_number_key UNIQUE (submission_number);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: admin_tokens admin_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.admin_tokens
    ADD CONSTRAINT admin_tokens_pkey PRIMARY KEY (id);


--
-- Name: admin_tokens admin_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.admin_tokens
    ADD CONSTRAINT admin_tokens_token_key UNIQUE (token);


--
-- Name: form_fields form_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.form_fields
    ADD CONSTRAINT form_fields_pkey PRIMARY KEY (id);


--
-- Name: forms forms_name_key; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_name_key UNIQUE (name);


--
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: submission_history submission_history_pkey; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.submission_history
    ADD CONSTRAINT submission_history_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_submission_number_key; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_submission_number_key UNIQUE (submission_number);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_tokens_active_expires; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_admin_tokens_active_expires ON beton.admin_tokens USING btree (is_active, expires_at);


--
-- Name: idx_admin_tokens_user; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_admin_tokens_user ON beton.admin_tokens USING btree (user_id);


--
-- Name: idx_form_fields_dynamic_source; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_form_fields_dynamic_source ON beton.form_fields USING btree (((dynamic_source ->> 'enabled'::text)), ((dynamic_source ->> 'source'::text)));


--
-- Name: idx_form_fields_form_order; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_form_fields_form_order ON beton.form_fields USING btree (form_id, order_index);


--
-- Name: idx_form_fields_form_section_order; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_form_fields_form_section_order ON beton.form_fields USING btree (form_id, section_id, order_index);


--
-- Name: idx_form_fields_linked_fields; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_form_fields_linked_fields ON beton.form_fields USING btree (((linked_fields ->> 'enabled'::text)));


--
-- Name: idx_form_fields_name_form; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_form_fields_name_form ON beton.form_fields USING btree (name, form_id);


--
-- Name: idx_form_fields_type; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_form_fields_type ON beton.form_fields USING btree (type);


--
-- Name: idx_forms_is_active; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_forms_is_active ON beton.forms USING btree (is_active);


--
-- Name: idx_settings_category; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_settings_category ON beton.settings USING btree (category);


--
-- Name: idx_submission_history_action; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_submission_history_action ON beton.submission_history USING btree (action_type, created_at);


--
-- Name: idx_submission_history_submission; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_submission_history_submission ON beton.submission_history USING btree (submission_id, created_at);


--
-- Name: idx_submission_history_user; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_submission_history_user ON beton.submission_history USING btree (user_id, created_at);


--
-- Name: idx_submissions_assigned; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_submissions_assigned ON beton.submissions USING btree (assigned_to_id, status, created_at DESC);


--
-- Name: idx_submissions_assigned_name; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_submissions_assigned_name ON beton.submissions USING btree (assigned_to_name, status);


--
-- Name: idx_submissions_bitrix_sync; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_submissions_bitrix_sync ON beton.submissions USING btree (bitrix_sync_status, created_at DESC);


--
-- Name: idx_submissions_form_created; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_submissions_form_created ON beton.submissions USING btree (form_id, created_at DESC);


--
-- Name: idx_submissions_form_name; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_submissions_form_name ON beton.submissions USING btree (form_name, created_at DESC);


--
-- Name: idx_submissions_priority_status; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_submissions_priority_status ON beton.submissions USING btree (priority, status);


--
-- Name: idx_submissions_status_created; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_submissions_status_created ON beton.submissions USING btree (status, created_at DESC);


--
-- Name: idx_submissions_tags; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_submissions_tags ON beton.submissions USING gin (tags);


--
-- Name: idx_submissions_user_email; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_submissions_user_email ON beton.submissions USING btree (user_email, status);


--
-- Name: idx_submissions_user_status; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_submissions_user_status ON beton.submissions USING btree (user_id, status, created_at DESC);


--
-- Name: idx_submissions_year_month; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_submissions_year_month ON beton.submissions USING btree (year_created, month_of_year);


--
-- Name: idx_users_bitrix_user_id; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_users_bitrix_user_id ON beton.users USING btree (bitrix_user_id);


--
-- Name: idx_users_email_lower; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_users_email_lower ON beton.users USING btree (lower((email)::text));


--
-- Name: idx_users_is_active; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_users_is_active ON beton.users USING btree (is_active);


--
-- Name: idx_users_role; Type: INDEX; Schema: beton; Owner: beton_user
--

CREATE INDEX idx_users_role ON beton.users USING btree (role);


--
-- Name: idx_admin_tokens_token; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX idx_admin_tokens_token ON public.admin_tokens USING btree (token);


--
-- Name: idx_admin_tokens_user; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX idx_admin_tokens_user ON public.admin_tokens USING btree (user_id);


--
-- Name: idx_settings_category; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX idx_settings_category ON public.settings USING btree (category);


--
-- Name: idx_settings_key; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX idx_settings_key ON public.settings USING btree (key);


--
-- Name: idx_submission_history_submission; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX idx_submission_history_submission ON public.submission_history USING btree (submission_id);


--
-- Name: idx_submission_history_user; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX idx_submission_history_user ON public.submission_history USING btree (user_id);


--
-- Name: idx_submissions_assigned_to_name; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX idx_submissions_assigned_to_name ON public.submissions USING btree (assigned_to_name, status);


--
-- Name: idx_submissions_form_data; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX idx_submissions_form_data ON public.submissions USING gin (form_data);


--
-- Name: idx_submissions_number_trgm; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX idx_submissions_number_trgm ON public.submissions USING gin (submission_number public.gin_trgm_ops);


--
-- Name: idx_submissions_status_created; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX idx_submissions_status_created ON public.submissions USING btree (status, created_at);


--
-- Name: idx_submissions_title_trgm; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX idx_submissions_title_trgm ON public.submissions USING gin (title public.gin_trgm_ops);


--
-- Name: idx_submissions_user_email_trgm; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX idx_submissions_user_email_trgm ON public.submissions USING gin (user_email public.gin_trgm_ops);


--
-- Name: idx_submissions_user_name_trgm; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX idx_submissions_user_name_trgm ON public.submissions USING gin (user_name public.gin_trgm_ops);


--
-- Name: form_fields update_form_fields_updated_at; Type: TRIGGER; Schema: beton; Owner: beton_user
--

CREATE TRIGGER update_form_fields_updated_at BEFORE UPDATE ON beton.form_fields FOR EACH ROW EXECUTE FUNCTION beton.update_updated_at_column();


--
-- Name: forms update_forms_updated_at; Type: TRIGGER; Schema: beton; Owner: beton_user
--

CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON beton.forms FOR EACH ROW EXECUTE FUNCTION beton.update_updated_at_column();


--
-- Name: settings update_settings_updated_at; Type: TRIGGER; Schema: beton; Owner: beton_user
--

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON beton.settings FOR EACH ROW EXECUTE FUNCTION beton.update_updated_at_column();


--
-- Name: submissions update_submissions_updated_at; Type: TRIGGER; Schema: beton; Owner: beton_user
--

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON beton.submissions FOR EACH ROW EXECUTE FUNCTION beton.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: beton; Owner: beton_user
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON beton.users FOR EACH ROW EXECUTE FUNCTION beton.update_updated_at_column();


--
-- Name: admin_tokens update_admin_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: beton_user
--

CREATE TRIGGER update_admin_tokens_updated_at BEFORE UPDATE ON public.admin_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: settings update_settings_updated_at; Type: TRIGGER; Schema: public; Owner: beton_user
--

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: submission_history update_submission_history_updated_at; Type: TRIGGER; Schema: public; Owner: beton_user
--

CREATE TRIGGER update_submission_history_updated_at BEFORE UPDATE ON public.submission_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_tokens admin_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.admin_tokens
    ADD CONSTRAINT admin_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES beton.users(id) ON DELETE CASCADE;


--
-- Name: form_fields form_fields_form_id_fkey; Type: FK CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.form_fields
    ADD CONSTRAINT form_fields_form_id_fkey FOREIGN KEY (form_id) REFERENCES beton.forms(id) ON DELETE CASCADE;


--
-- Name: submission_history submission_history_submission_id_fkey; Type: FK CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.submission_history
    ADD CONSTRAINT submission_history_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES beton.submissions(id) ON DELETE CASCADE;


--
-- Name: submission_history submission_history_user_id_fkey; Type: FK CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.submission_history
    ADD CONSTRAINT submission_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES beton.users(id);


--
-- Name: submissions submissions_assigned_to_id_fkey; Type: FK CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.submissions
    ADD CONSTRAINT submissions_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES beton.users(id);


--
-- Name: submissions submissions_form_id_fkey; Type: FK CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.submissions
    ADD CONSTRAINT submissions_form_id_fkey FOREIGN KEY (form_id) REFERENCES beton.forms(id);


--
-- Name: submissions submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: beton; Owner: beton_user
--

ALTER TABLE ONLY beton.submissions
    ADD CONSTRAINT submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES beton.users(id);


--
-- Name: admin_tokens admin_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.admin_tokens
    ADD CONSTRAINT admin_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: form_fields form_fields_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.form_fields
    ADD CONSTRAINT form_fields_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE;


--
-- Name: submission_history submission_history_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.submission_history
    ADD CONSTRAINT submission_history_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE;


--
-- Name: submission_history submission_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.submission_history
    ADD CONSTRAINT submission_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: submissions submissions_assigned_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES public.users(id);


--
-- Name: submissions submissions_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id);


--
-- Name: submissions submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

