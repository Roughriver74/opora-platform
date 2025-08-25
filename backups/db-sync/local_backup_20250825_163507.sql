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
ALTER TABLE IF EXISTS ONLY public.submissions DROP CONSTRAINT IF EXISTS "FK_fca12c4ddd646dea4572c6815a9";
ALTER TABLE IF EXISTS ONLY public.submissions DROP CONSTRAINT IF EXISTS "FK_82318f9579f8f3df8480d46990f";
ALTER TABLE IF EXISTS ONLY public.admin_tokens DROP CONSTRAINT IF EXISTS "FK_7284b9f135db6f9fe3e95f2554c";
ALTER TABLE IF EXISTS ONLY public.submissions DROP CONSTRAINT IF EXISTS "FK_3c092eb0379093a69b2f1310b5c";
ALTER TABLE IF EXISTS ONLY beton.submissions DROP CONSTRAINT IF EXISTS submissions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY beton.submissions DROP CONSTRAINT IF EXISTS submissions_form_id_fkey;
ALTER TABLE IF EXISTS ONLY beton.submissions DROP CONSTRAINT IF EXISTS submissions_assigned_to_id_fkey;
ALTER TABLE IF EXISTS ONLY beton.submission_history DROP CONSTRAINT IF EXISTS submission_history_user_id_fkey;
ALTER TABLE IF EXISTS ONLY beton.submission_history DROP CONSTRAINT IF EXISTS submission_history_submission_id_fkey;
ALTER TABLE IF EXISTS ONLY beton.form_fields DROP CONSTRAINT IF EXISTS form_fields_form_id_fkey;
ALTER TABLE IF EXISTS ONLY beton.admin_tokens DROP CONSTRAINT IF EXISTS admin_tokens_user_id_fkey;
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
DROP INDEX IF EXISTS public."IDX_e8f45bbc74594473ac8b015b78";
DROP INDEX IF EXISTS public."IDX_e837f893b6992b8b174df26c54";
DROP INDEX IF EXISTS public."IDX_e3ecc79dd6a4df4fdecf28bf64";
DROP INDEX IF EXISTS public."IDX_e2000d5e63746c4f2a03fdc76e";
DROP INDEX IF EXISTS public."IDX_deac577b3b227e5e67aa53b7e1";
DROP INDEX IF EXISTS public."IDX_d962ccfdb1034078a122f8d850";
DROP INDEX IF EXISTS public."IDX_c8639b7626fa94ba8265628f21";
DROP INDEX IF EXISTS public."IDX_b5c4e2f5d600cd07185897ce7c";
DROP INDEX IF EXISTS public."IDX_ace513fa30d485cfd25c11a9e4";
DROP INDEX IF EXISTS public."IDX_a60d70d105b562c7bff6b3c25c";
DROP INDEX IF EXISTS public."IDX_a5d1c41a29ff1027763a9bbc0c";
DROP INDEX IF EXISTS public."IDX_97672ac88f789774dd47f7c8be";
DROP INDEX IF EXISTS public."IDX_90def9e2333543f1caff824161";
DROP INDEX IF EXISTS public."IDX_8a45fc9ecc8373746567c65d4c";
DROP INDEX IF EXISTS public."IDX_86b3e19794ca9b548ab505de60";
DROP INDEX IF EXISTS public."IDX_7bd879d7fd42288f41f95cce35";
DROP INDEX IF EXISTS public."IDX_7a0e3f6c32bd569d4dc06103e9";
DROP INDEX IF EXISTS public."IDX_73936e0a4fc14f01d543be60cb";
DROP INDEX IF EXISTS public."IDX_7284b9f135db6f9fe3e95f2554";
DROP INDEX IF EXISTS public."IDX_6b7b1d9d55a575b557c3a848bd";
DROP INDEX IF EXISTS public."IDX_654ca06758430c56ab906852e4";
DROP INDEX IF EXISTS public."IDX_51be0fb9b4dae26a52326a3ad8";
DROP INDEX IF EXISTS public."IDX_5129229bcc3a55949e494aa3d5";
DROP INDEX IF EXISTS public."IDX_302bc58f05e57b971dafad21dc";
DROP INDEX IF EXISTS public."IDX_2cc0aa3a44e03edec13874c217";
DROP INDEX IF EXISTS public."IDX_2a9cf5daab7117d26ac65b7027";
DROP INDEX IF EXISTS public."IDX_28f1a218cd20cf7f1e218c5dc2";
DROP INDEX IF EXISTS public."IDX_23d4b380540ea7fe12f0fbf56e";
DROP INDEX IF EXISTS public."IDX_20c7aea6112bef71528210f631";
DROP INDEX IF EXISTS public."IDX_1755f90c28c340d9c1e80d3439";
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
ALTER TABLE IF EXISTS ONLY public.forms DROP CONSTRAINT IF EXISTS forms_pkey;
ALTER TABLE IF EXISTS ONLY public.forms DROP CONSTRAINT IF EXISTS forms_name_key;
ALTER TABLE IF EXISTS ONLY public.settings DROP CONSTRAINT IF EXISTS "UQ_c8639b7626fa94ba8265628f214";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS "UQ_97672ac88f789774dd47f7c8be3";
ALTER TABLE IF EXISTS ONLY public.admin_tokens DROP CONSTRAINT IF EXISTS "UQ_8a45fc9ecc8373746567c65d4c0";
ALTER TABLE IF EXISTS ONLY public.forms DROP CONSTRAINT IF EXISTS "UQ_86b3e19794ca9b548ab505de60d";
ALTER TABLE IF EXISTS ONLY public.submissions DROP CONSTRAINT IF EXISTS "UQ_6b7b1d9d55a575b557c3a848bdb";
ALTER TABLE IF EXISTS ONLY public.form_fields DROP CONSTRAINT IF EXISTS "PK_dc4b73290f2926c3a7d7c92d1e1";
ALTER TABLE IF EXISTS ONLY public.migrations DROP CONSTRAINT IF EXISTS "PK_8c82d7f526340ab734260ea46be";
ALTER TABLE IF EXISTS ONLY public.admin_tokens DROP CONSTRAINT IF EXISTS "PK_1b8fe3dbc19bbe91baa16ab6b09";
ALTER TABLE IF EXISTS ONLY public.submission_history DROP CONSTRAINT IF EXISTS "PK_117f7e255b4beed18f4ee98d369";
ALTER TABLE IF EXISTS ONLY public.settings DROP CONSTRAINT IF EXISTS "PK_0669fe20e252eb692bf4d344975";
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
DROP TYPE IF EXISTS public.users_status_enum;
DROP TYPE IF EXISTS public.users_role_enum;
DROP TYPE IF EXISTS public.submissions_priority_enum;
DROP TYPE IF EXISTS public.submissions_bitrix_sync_status_enum;
DROP TYPE IF EXISTS public.submission_history_actiontype_enum;
DROP TYPE IF EXISTS public.submission_history_action_type_enum;
DROP TYPE IF EXISTS public.settings_category_enum;
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
-- Name: settings_category_enum; Type: TYPE; Schema: public; Owner: beton_user
--

CREATE TYPE public.settings_category_enum AS ENUM (
    'system',
    'bitrix',
    'email',
    'notification',
    'security',
    'ui'
);


ALTER TYPE public.settings_category_enum OWNER TO beton_user;

--
-- Name: submission_history_action_type_enum; Type: TYPE; Schema: public; Owner: beton_user
--

CREATE TYPE public.submission_history_action_type_enum AS ENUM (
    'create',
    'update',
    'status_change',
    'assign',
    'comment',
    'sync_bitrix',
    'delete'
);


ALTER TYPE public.submission_history_action_type_enum OWNER TO beton_user;

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
-- Name: submissions_bitrix_sync_status_enum; Type: TYPE; Schema: public; Owner: beton_user
--

CREATE TYPE public.submissions_bitrix_sync_status_enum AS ENUM (
    'pending',
    'synced',
    'failed'
);


ALTER TYPE public.submissions_bitrix_sync_status_enum OWNER TO beton_user;

--
-- Name: submissions_priority_enum; Type: TYPE; Schema: public; Owner: beton_user
--

CREATE TYPE public.submissions_priority_enum AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE public.submissions_priority_enum OWNER TO beton_user;

--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: beton_user
--

CREATE TYPE public.users_role_enum AS ENUM (
    'user',
    'admin'
);


ALTER TYPE public.users_role_enum OWNER TO beton_user;

--
-- Name: users_status_enum; Type: TYPE; Schema: public; Owner: beton_user
--

CREATE TYPE public.users_status_enum AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE public.users_status_enum OWNER TO beton_user;

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
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    token character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    purpose text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_used_at timestamp without time zone,
    expires_at timestamp without time zone NOT NULL,
    ip_address character varying(45),
    user_agent text
);


ALTER TABLE public.admin_tokens OWNER TO beton_user;

--
-- Name: form_fields; Type: TABLE; Schema: public; Owner: beton_user
--

CREATE TABLE public.form_fields (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    form_id uuid NOT NULL,
    section_id character varying(100),
    name character varying(255) NOT NULL,
    label character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    required boolean DEFAULT false NOT NULL,
    placeholder character varying(255),
    bitrix_field_id character varying(100),
    bitrix_field_type character varying(100),
    bitrix_entity character varying(50),
    options jsonb,
    dynamic_source jsonb,
    linked_fields jsonb,
    "order" integer DEFAULT 0 NOT NULL
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
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    key character varying(255) NOT NULL,
    value jsonb NOT NULL,
    category public.settings_category_enum DEFAULT 'system'::public.settings_category_enum NOT NULL,
    description text,
    is_public boolean DEFAULT false NOT NULL,
    is_encrypted boolean DEFAULT false NOT NULL,
    validation jsonb,
    metadata jsonb
);


ALTER TABLE public.settings OWNER TO beton_user;

--
-- Name: submission_history; Type: TABLE; Schema: public; Owner: beton_user
--

CREATE TABLE public.submission_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    submission_id uuid NOT NULL,
    user_id uuid,
    action_type public.submission_history_action_type_enum NOT NULL,
    description text NOT NULL,
    changes jsonb,
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

COPY public.admin_tokens (id, created_at, updated_at, token, user_id, purpose, is_active, last_used_at, expires_at, ip_address, user_agent) FROM stdin;
\.


--
-- Data for Name: form_fields; Type: TABLE DATA; Schema: public; Owner: beton_user
--

COPY public.form_fields (id, created_at, updated_at, form_id, section_id, name, label, type, required, placeholder, bitrix_field_id, bitrix_field_type, bitrix_entity, options, dynamic_source, linked_fields, "order") FROM stdin;
b34b96e8-e526-4e88-9696-faed15c9ba14	2025-06-18 16:34:02.596	2025-06-25 11:28:33.823	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750264442280	Бетон*(Покупатель)	autocomplete	f	\N	UF_CRM_1726227037	\N	\N	[]	{"source": "catalog", "enabled": true}	{"enabled": false, "mappings": []}	23
37c86a9b-be21-4464-af8e-613774a72c2f	2025-06-18 16:35:35.46	2025-06-25 11:28:33.112	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750264535138	Основное	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	1
07ee3014-d87f-463f-981f-98d999502a66	2025-06-18 17:07:29.717	2025-06-25 11:28:33.721	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266449458	Бетон*(Завод)	autocomplete	f	\N	UF_CRM_1726227410	\N	\N	[]	{"source": "catalog", "enabled": true}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750264442280", "sourceFieldLabel": "Бетон*(Покупатель)", "sourceSectionName": "Раздел 2"}}	20
4b8ac008-667c-4dcc-ba3b-0b9d863220eb	2025-06-18 17:10:20.008	2025-06-25 11:28:33.856	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266619706	Продажа цена	number	f	\N	UF_CRM_1701767765591	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	25
e95c36fc-6c34-48ea-b988-24a78d9dde6f	2025-06-18 17:10:20.812	2025-06-25 11:28:33.838	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266620544	Объем м3	number	f	\N	UF_CRM_DEAL_AMO_SDLLUUKQTVRWOVQK	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	24
24ae568f-ff0a-407d-a9c6-b90a4b3ca4f1	2025-06-18 17:10:21.068	2025-06-25 14:42:37.668	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266620782	(П) Раствор*	autocomplete	f	\N	UF_CRM_1726645181	\N	\N	[]	{"source": "catalog", "enabled": true}	{"enabled": false, "mappings": []}	30
0427633d-2322-4587-ad83-225d1d3c2548	2025-06-18 17:10:21.319	2025-06-25 14:43:46.741	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266621044	Объем м3	number	f	\N	UF_CRM_1717006045698	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	31
0f3f32c0-373e-442e-b121-54986939470d	2025-06-18 17:10:21.765	2025-06-25 14:43:44.367	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266621465	Продажа цена 	number	f	\N	UF_CRM_1717005986470	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	32
b67c537f-6ecd-4f07-903d-b5782f4a187e	2025-06-18 17:10:21.89	2025-06-25 14:45:02.209	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266621254	ЦПС*(покупатель)	autocomplete	f	\N	UF_CRM_1726646781	\N	\N	[]	{"source": "catalog", "enabled": true}	{"enabled": false, "mappings": []}	37
27919abf-0689-4f62-a6ec-3e9c7e166f2b	2025-06-18 17:10:21.973	2025-06-25 14:44:48.669	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266621671	Объем м3 ЦПС	number	f	\N	UF_CRM_1717006372206	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	38
bdf2f934-557c-4258-ad62-55cf9a65bc4b	2025-06-18 17:10:22.144	2025-06-25 14:44:34.929	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266621870	Продажа цена (ЦПС)	number	f	\N	UF_CRM_1717006325903	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	39
b9e22d7a-1e29-4eb9-91b2-ce39d5520666	2025-06-18 17:10:22.364	2025-06-25 14:45:34.78	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266622094	ПМД клиент *	autocomplete	f	\N	UF_CRM_1728985169	\N	\N	[]	{"source": "catalog", "enabled": true}	{"enabled": false, "mappings": []}	51
6de480e6-355e-40a1-ab2c-6c1618dbadf6	2025-06-18 17:10:22.657	2025-06-25 14:45:55.19	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266622394	ПМД цена	number	f	\N	UF_CRM_1703354580587	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	52
b0024ffe-a218-4286-bbe9-b46051f1d5cb	2025-06-18 17:10:22.868	2025-06-25 14:46:44.466	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266622604	(П) кол-во	number	f	\N	UF_CRM_1717096373303	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	56
70b5b281-a2c9-47c7-a7ec-bb9ab760c340	2025-06-18 17:10:23.034	2025-06-25 14:46:37.761	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266622777	(П) цена	number	f	\N	UF_CRM_1701770192694	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	57
89d8f22f-d686-41b9-97e4-7d38d8c6b9e3	2025-06-18 17:10:23.223	2025-06-26 05:27:32.46	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266622968	Простой	number	f	\N	UF_CRM_1701770050268	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	60
e2dc195c-67a5-4684-81b4-41064389b878	2025-06-18 17:10:23.614	2025-06-26 05:28:39.406	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266623348	(П) Кол-во	number	f	\N	UF_CRM_1717096242315	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	64
ddb03891-fc77-4138-8dac-fbcc6907e9ae	2025-06-18 17:10:23.777	2025-06-26 05:28:28.696	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266623522	(П) Продажа	number	f	\N	UF_CRM_DEAL_AMO_UBIRIOZMVVXSQCQX	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	65
beec2b49-5382-4add-b816-e1612e4d8dfb	2025-06-18 17:10:24.027	2025-06-25 14:47:54.561	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266623722	(П) Кол-во	number	f	\N	UF_CRM_1717098917545	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	69
38774535-24ea-41f8-bae3-346a44ff2454	2025-06-18 17:10:24.201	2025-06-25 14:48:13.689	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266623941	(П) Продажа	number	f	\N	UF_CRM_DEAL_AMO_ZCAXLRFJAJVSCLKU	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	70
391f51bc-6566-4595-a2ab-29ab4c3d40ed	2025-06-18 17:10:24.396	2025-06-25 11:28:35.336	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266624128	(П) Кол-во	number	f	\N	UF_CRM_1717096301193	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	74
023a6172-09db-410f-a857-15731c94d042	2025-06-18 17:10:24.603	2025-06-25 11:28:35.408	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266624331	(П) Вибратор	number	f	\N	UF_CRM_1701770255484	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	75
4eefa2b4-ba4e-4460-9b45-59c34474a199	2025-06-18 17:10:24.806	2025-06-25 14:49:30.806	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266624534	(П) кол-во	number	f	\N	UF_CRM_1717096448380	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	79
276a1f89-48ce-4af8-b48b-9c9ce6f894bf	2025-06-18 17:10:25.006	2025-06-25 14:49:31.901	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266624729	(П) Цена	number	f	\N	UF_CRM_1717096477308	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	80
d18fb8d3-b21a-4102-9f7b-7aae78aa0fb7	2025-06-18 17:10:25.203	2025-06-26 05:31:47.641	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266624946	(П) Метров*	number	f	\N	UF_CRM_DEAL_AMO_OCVXGORBIKXPDWXR	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	93
565644fe-b19f-4c18-828a-fa94ce92db99	2025-06-18 17:10:25.316	2025-06-25 14:49:53.752	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266625044	(П) Шланги цена*	number	f	\N	UF_CRM_1701776649263	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	92
4c882cf3-0d7f-4e05-b769-11370c9eb73e	2025-06-18 17:10:25.664	2025-06-26 05:32:31.481	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266625381	(П) Кол-во	number	f	\N	UF_CRM_1717095321371	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	97
9ea833a6-91aa-4265-9418-acf12600e533	2025-06-18 17:10:25.827	2025-06-26 05:32:37.421	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266625556	(П) Цена	number	f	\N	UF_CRM_1701776849642	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	98
ef9b7199-1836-474d-a281-983b02a868c9	2025-06-18 17:10:25.87	2025-06-25 14:52:02.274	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266625257	(П) Кол-во	number	f	\N	UF_CRM_1717095184056	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	102
5be1fb0a-1578-4558-b4a2-8d1f3c4e9257	2025-06-18 17:10:26.035	2025-06-25 14:51:59.503	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266625772	(П) Цена	number	f	\N	UF_CRM_1701776883160	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	103
9c15efbf-9648-4c7e-8e36-425970798fdf	2025-06-18 17:10:27.759	2025-06-25 14:53:26.869	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266627483	(П) Кол-во	number	f	\N	UF_CRM_1717094034869	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	107
49b6c8c4-512a-4131-a420-b5c1a4028c64	2025-06-18 17:10:28.072	2025-06-25 14:53:36.114	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266627796	(П) Продажа	number	f	\N	UF_CRM_DEAL_AMO_ZTPZAOFYKAAFZAFZ	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	108
e0ad6fa3-f8d7-42ff-8827-294b9abd568c	2025-06-18 17:10:28.296	2025-06-25 11:28:36.4	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266628018	АБН ПОКУБОВКА	autocomplete	f	\N	UF_CRM_1735217306	\N	\N	[]	{"source": "catalog", "enabled": true}	{"enabled": false, "mappings": []}	110
56bb1270-1755-4723-9f10-b504023df67f	2025-06-18 17:14:00.474	2025-06-25 11:28:33.163	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266840204	Компания	autocomplete	f	\N	COMPANY_ID	\N	\N	[]	{"source": "companies", "enabled": true}	{"enabled": false, "mappings": []}	4
fccd26ea-561f-4f5e-a3f7-c9a8c2c0dfdd	2025-06-18 18:14:46.317	2025-06-25 11:28:33.751	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750270486191	Закупка цена	number	f	\N	UF_CRM_1701767745071	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266619706", "sourceFieldLabel": "Продажа цена", "sourceSectionName": "Раздел 2"}}	22
e87c2b48-3b61-4c23-b421-f39a00b74369	2025-06-18 18:14:46.709	2025-06-25 14:42:26.253	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750270486582	(З) Раствор*	autocomplete	f	\N	UF_CRM_1726645231	\N	\N	[]	{"source": "catalog", "enabled": true}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266620782", "sourceFieldLabel": "Раствор*(покупатель)", "sourceSectionName": "Раздел 2"}}	27
3f5da63f-10d8-4816-99df-1a48c980f8ac	2025-06-18 18:14:47.266	2025-06-25 14:43:27.596	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750270487125	Закупка цена 	number	f	\N	UF_CRM_1717005961120	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266621465", "sourceFieldLabel": "Продажа цена (раствора)", "sourceSectionName": "Раздел 2"}}	29
429a3fa0-092a-4dff-b241-4214d241bdbe	2025-06-18 18:14:47.457	2025-06-25 14:43:15.504	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750270486746	Объем м3 (завод)	number	f	\N	UF_CRM_1717006036025	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266621044", "sourceFieldLabel": "Объем раствора м3", "sourceSectionName": "Раздел 2"}}	28
34332d03-6017-434f-819d-44125aed0b20	2025-06-18 18:14:47.919	2025-06-25 14:44:54.071	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750270487773	ЦПС*(завод)	autocomplete	f	\N	UF_CRM_1726646803	\N	\N	[]	{"source": "catalog", "enabled": true}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266621254", "sourceFieldLabel": "ЦПС*(покупатель)", "sourceSectionName": "Раздел 2"}}	34
b347c158-41be-4ab0-a260-8b05883310b8	2025-06-18 18:14:47.939	2025-06-25 14:44:43.477	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750270487778	Объем ЦПС м3 (завод)	number	f	\N	UF_CRM_1717006355619	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266621671", "sourceFieldLabel": "Объем м3 ЦПС", "sourceSectionName": "Раздел 2"}}	35
62f77d91-a96d-4fca-bf2f-616410d808f8	2025-06-18 18:30:40.136	2025-06-25 11:28:33.382	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750271440089	Об Объекте	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	9
aa0d89d1-39eb-4bac-a67e-84a6d3cbf8e3	2025-06-18 18:31:17.844	2025-06-25 11:28:33.673	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750271477786	Бетон	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	19
a09e7801-3a4b-4162-b5e3-d8a0cb7d17a7	2025-06-18 18:31:42.549	2025-06-25 11:28:33.903	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750271502496	Раствор	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	26
d1c5fb02-be44-422a-8e8c-ca34f690cb75	2025-06-18 18:32:05.055	2025-06-25 11:28:34.098	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750271525009	ЦПС	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	33
2f9f9e4b-b8ce-493e-8153-512a5b4c7b0d	2025-06-18 18:35:39.892	2025-06-25 11:28:33.393	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750271739843	Заказчик	autocomplete	f	\N	UF_CRM_1738914120	\N	\N	[]	{"source": "companies", "enabled": true}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266840204", "sourceFieldLabel": "Компания", "sourceSectionName": "Раздел 1"}}	10
ea9dabcb-2aa7-4d6e-8b7b-a56bcfe207bc	2025-06-18 21:18:22.907	2025-06-25 14:54:01.904	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750281502732	(П) Цена	number	f	\N	UF_CRM_1701776494308	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	113
51481c33-0704-4696-8622-018d17a9b25b	2025-06-18 21:18:43.083	2025-06-25 11:28:36.422	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750281522910	Объем м3	number	f	\N	UF_CRM_1736847470169	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	112
43ca5268-edd3-4e2f-babd-8606ff6f69d2	2025-06-18 21:19:10.43	2025-06-25 11:28:36.536	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750281550344	(П) Цена	number	f	\N	UF_CRM_1701777034844	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	116
171a225d-a51c-4563-bac6-1d35c62c15f3	2025-06-18 21:19:15.637	2025-06-25 11:28:36.582	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750281555558	(П) Цена	number	f	\N	UF_CRM_1701777074178	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	119
e32637f3-259e-49f5-8726-725e652601ba	2025-06-19 05:37:56.753	2025-06-25 14:44:36.722	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311476626	Закупка цена (ЦПС)	number	f	\N	UF_CRM_1717006310796	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266621870", "sourceFieldLabel": "Продажа цена (ЦПС)", "sourceSectionName": "Раздел 2"}}	36
63df06c1-e1a8-4f36-978c-e10849c73346	2025-06-19 05:38:44.331	2025-06-25 11:28:34.265	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311524211	Адрес доставки	text	f	\N	UF_CRM_DEAL_AMO_EYJSNWMSVBDZFPVH	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	41
87b34c1a-78de-4e95-a137-f26cec07ded2	2025-06-19 05:38:47.555	2025-06-25 11:28:34.309	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311527436	Завод отгрузки	select	f	\N	UF_CRM_DEAL_AMO_PCQAEQKUXZMBZXMG	\N	\N	[{"_id": "6853a28ccc921ec7babd89fa", "label": "ТШ", "value": "87"}, {"_id": "6853a28ccc921ec7babd89fb", "label": "ВШ", "value": "88"}, {"_id": "6853a28ccc921ec7babd89fc", "label": "ЯН", "value": "89"}, {"_id": "6853a28ccc921ec7babd89fd", "label": "БО", "value": "86"}]	{"enabled": false}	{"enabled": false, "mappings": []}	42
0fc702c0-da2b-4cb4-aba4-11190517fe73	2025-06-19 05:38:48.276	2025-06-25 11:28:34.313	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311528161	(З) Кол-во доставок 	number	f	\N	UF_CRM_1701769301290	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	43
2bb79e4a-b5e7-4c18-88c1-e20d6a25688f	2025-06-19 05:38:48.693	2025-06-26 05:26:09.384	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311528570	(П) Кол-во доставок	number	f	\N	UF_CRM_1701769324763	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	45
ccd44145-820d-400a-b1cb-7bce2bb40584	2025-06-19 05:38:48.896	2025-06-26 05:26:19.425	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311528785	(З) Цена доставки 	number	f	\N	UF_CRM_1703322990010	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	44
0e04942c-61d1-4d7a-9535-19ca7efd9546	2025-06-19 05:38:49.099	2025-06-25 11:28:34.391	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311528986	(П) Цена доставки	number	f	\N	UF_CRM_1701765793423	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	46
c125d8ab-6cfe-4e35-8d04-328549d675b8	2025-06-19 05:38:50.071	2025-06-25 11:28:34.416	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311529951	Интервал	text	f	\N	UF_CRM_1702992754327	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	47
9ee502c6-372d-4588-bfd9-b76764b01453	2025-06-19 05:41:10.246	2025-06-25 11:28:35.622	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311670121	Время АБН(дата/время)	date	f	\N	UF_CRM_1732302589098	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	82
b346a287-ab5c-4313-86e2-c0eb03766d7d	2025-06-19 05:41:23.97	2025-06-25 11:28:35.654	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311683836	Длина стрелы*	autocomplete	f	\N	UF_CRM_1728560118	\N	\N	[]	{"source": "catalog", "enabled": true}	{"enabled": false, "mappings": []}	83
8b8dbd3b-c38f-4a2e-81cd-752d7ea3a2b4	2025-06-19 05:41:24.208	2025-06-25 11:28:35.681	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311684096	Подача завод ч.	number	f	\N	UF_CRM_1717095831894	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	84
62ee9d59-96ce-4f0b-979f-b73bcd2b3b57	2025-06-19 05:41:26.141	2025-06-25 11:28:35.707	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311686023	Подача покупатель ч.	number	f	\N	UF_CRM_1717095861228	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	85
72bd5be1-b44d-4760-b21b-6ece2cc5f33f	2025-06-19 05:41:29.574	2025-06-25 11:28:35.723	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311689459	(З) Кол-во часов	number	f	\N	UF_CRM_1701775589163	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	86
07dc48d1-de54-4ebf-8c8c-0447844d315a	2025-06-19 05:41:31.426	2025-06-26 05:29:55.403	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311691296	(П) Кол-во часов	number	f	\N	UF_CRM_1701776045278	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	88
e81e903a-f6d2-4db0-a6fb-e63b22d394b5	2025-06-19 05:43:09.443	2025-06-26 05:30:03.488	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311789323	(З) Цена часа 	number	f	\N	UF_CRM_1701776248446	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	87
ce16653f-adee-4f47-8a37-aa9df3154495	2025-06-19 05:43:11.619	2025-06-25 11:28:35.78	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311791500	(П) Цена часа	number	f	\N	UF_CRM_1701776307741	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	89
522ee6ec-133a-4aa1-b266-65f5755eb0db	2025-06-19 05:44:22.598	2025-06-25 11:28:33.422	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311862479	Плательщик	autocomplete	f	\N	UF_CRM_1738914155	\N	\N	[]	{"source": "companies", "enabled": true}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266840204", "sourceFieldLabel": "Компания", "sourceSectionName": "Раздел 1"}}	11
063d8d26-1afb-40a7-9881-ed61ef752001	2025-06-19 05:44:24.158	2025-06-25 11:28:33.479	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311864035	Грузополучатель(new)	autocomplete	f	\N	UF_CRM_1734765673	\N	\N	[]	{"source": "companies", "enabled": true}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266840204", "sourceFieldLabel": "Компания", "sourceSectionName": "Раздел 1"}}	12
11ce7f61-42f4-4db1-9948-cd0e72027a0a	2025-06-19 05:44:25.508	2025-06-25 11:28:33.49	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311865385	Дата отгрузки(заявка) время	date	f	\N	UF_CRM_DEAL_AMO_ZQPKHIULGGHVBIQB	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	13
42328bf9-5ca1-41f3-9ae3-f1591d66e4ec	2025-06-19 05:44:26.921	2025-06-25 11:28:33.519	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311866802	Форма оплаты	select	f	\N	UF_CRM_1703351328529	\N	\N	[{"_id": "6853a424cc921ec7babd8b0e", "label": "НЛ", "value": "184"}, {"_id": "6853a424cc921ec7babd8b0f", "label": "БН", "value": "185"}, {"_id": "6853a424cc921ec7babd8b10", "label": "БР", "value": "383"}]	{"enabled": false}	{"enabled": false, "mappings": []}	14
1a1fa8d6-a8bb-4439-82b2-61b1b2033ecb	2025-06-19 05:46:20.637	2025-06-25 11:28:33.556	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750311980514	Сумма с объекта	number	f	\N	UF_CRM_1703351404840	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	15
121eed79-823a-4b2e-8a57-b56c9cfb3713	2025-06-19 05:46:42.008	2025-06-25 11:28:33.559	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750312001886	Контактное лицо на объекте	text	f	\N	UF_CRM_1701768456179	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	16
5cd2152b-3598-48bb-9eaa-1d2759551495	2025-06-19 05:47:17.747	2025-06-25 11:28:33.628	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750312037627	Комментарий	textarea	f	\N	COMMENTS	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	17
80c64b6e-d636-4d4c-85e3-c3a2c00ffd08	2025-06-19 06:29:56.844	2025-06-25 11:28:33.734	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750314596620	Объем м3 (завод)	number	f	\N	UF_CRM_1703322858101	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266620544", "sourceFieldLabel": "Объем м3", "sourceSectionName": "Раздел 2"}}	21
21ea3bf6-ca1a-451f-b952-978fb45a826c	2025-06-19 12:24:16.835	2025-06-25 14:45:25.896	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750335856695	ПМД (завод)*	autocomplete	f	\N	UF_CRM_1728985144	\N	\N	[]	{"source": "catalog", "enabled": true}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266622094", "sourceFieldLabel": "ПМД клиент *", "sourceSectionName": "Раздел 2"}}	49
d5d92a7f-a286-4f00-b29d-f33ce69af077	2025-06-19 12:24:17.904	2025-06-25 14:45:49.456	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750335857819	ПМД цена (завод)	number	f	\N	UF_CRM_1734770907	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266622394", "sourceFieldLabel": "ПМД цена", "sourceSectionName": "Раздел 2"}}	50
678c715e-a718-462a-87d9-58c5bae60a83	2025-06-19 12:24:18.677	2025-06-25 14:46:54.936	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750335858596	(З) Кол-во 	number	f	\N	UF_CRM_1717096348203	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266622604", "sourceFieldLabel": "Труба кол-во", "sourceSectionName": "Раздел 2"}}	54
19071fd4-511f-466c-81a8-51d5153b09f1	2025-06-19 12:24:20.111	2025-06-26 05:27:42.515	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750335860038	Простой (завод)	number	f	\N	UF_CRM_1701770024543	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	59
6eb0f6e3-be13-4c06-9c13-60aa4c52df6f	2025-06-19 12:24:21.163	2025-06-26 05:28:21.178	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750335861080	(З) Кол-во 	number	f	\N	UF_CRM_1717096226584	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266623348", "sourceFieldLabel": "Замывка кол-во", "sourceSectionName": "Раздел 2"}}	62
c9366d2e-5a02-4001-b0f4-1f7cf712fb92	2025-06-19 12:27:08.664	2025-06-26 05:28:31.571	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750336028589	(З) Закупка	number	f	\N	UF_CRM_DEAL_AMO_CBNPUFWPEBKNPOND	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266623522", "sourceFieldLabel": "Замывка продажа", "sourceSectionName": "Раздел 2"}}	63
b50d8522-317b-4a0d-be63-fdc0a5f16808	2025-06-19 12:48:54.208	2025-06-25 14:47:28.254	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750337334103	(З) Кол-во	number	f	\N	UF_CRM_1701770100923	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	67
12f8da18-a76b-4d13-bb5b-368bafcfc6f0	2025-06-19 12:49:24.775	2025-06-25 14:47:41.958	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750337364667	(З) Закупка	number	f	\N	UF_CRM_DEAL_AMO_WQWMNREMXIDNPPOW	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266623941", "sourceFieldLabel": "Перестановка продажа", "sourceSectionName": "Раздел 2"}}	68
48a3f323-ec55-4978-8a92-c4597bb60f23	2025-06-19 12:49:29.222	2025-06-25 11:28:35.287	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750337369120	(З) Кол-во	number	f	\N	UF_CRM_1717096287433	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266624128", "sourceFieldLabel": "Вибратор кол-во", "sourceSectionName": "Раздел 2"}}	72
bdd52d30-1979-4d7a-a78b-ac1d1b137417	2025-06-19 12:49:31.526	2025-06-25 11:28:35.353	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750337371425	(З) Вибратор 	number	f	\N	UF_CRM_1701770238864	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266624331", "sourceFieldLabel": "Вибратор", "sourceSectionName": "Раздел 2"}}	73
f5f98289-3cca-4abf-bccc-b24946366884	2025-06-24 18:43:14.803	2025-06-25 14:57:02.521	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790594671	кол-во Перестановка АБН  	number	f	\N	UF_CRM_1717095554632	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	142
4d03b265-6a85-4240-be9f-bc8279cfd475	2025-06-19 12:49:33.819	2025-06-25 14:49:11.682	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750337373718	(З) Кол-во	number	f	\N	UF_CRM_1717096432722	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266624534", "sourceFieldLabel": "Конус кол-во", "sourceSectionName": "Раздел 2"}}	77
ac8b4923-758a-4fa4-a545-72677f5e8ee3	2025-06-19 12:51:34.981	2025-06-25 14:49:28.373	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750337494868	(З) Цена	number	f	\N	UF_CRM_1717096463485	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266624729", "sourceFieldLabel": "Конус цена", "sourceSectionName": "Раздел 2"}}	78
cc403072-0a51-4ded-9606-613bc4c41ad6	2025-06-19 12:51:36.148	2025-06-26 05:31:44.42	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750337496043	(З) Шланги цена 	number	f	\N	UF_CRM_1701776635179	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266625044", "sourceFieldLabel": "Шланги цена*", "sourceSectionName": "Раздел 2"}}	91
64a7c865-656e-4954-a882-2e0adede3340	2025-06-19 12:51:36.588	2025-06-26 05:32:52.689	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750337496490	(З) Кол-во	number	f	\N	UF_CRM_1717095299101	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266625381", "sourceFieldLabel": "Перестановка АБН кол-во", "sourceSectionName": "Раздел 2"}}	95
00f2e838-9c5e-4e1d-a758-fb48510a393e	2025-06-19 12:51:36.885	2025-06-26 05:32:45.808	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750337496782	(З) Цена	number	f	\N	UF_CRM_1701776837170	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266625556", "sourceFieldLabel": "Перестановка АБН", "sourceSectionName": "Раздел 2"}}	96
41c59eed-913b-4d94-b7f3-b0e52946c8fc	2025-06-19 12:51:37.175	2025-06-25 14:51:32.879	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750337497066	(З) Кол-во	number	f	\N	UF_CRM_1717095122311	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266625257", "sourceFieldLabel": "Замывка АБН кол-во", "sourceSectionName": "Раздел 2"}}	100
c02c681c-765f-4b3e-92d0-b9266ef021c7	2025-06-19 12:51:37.479	2025-06-25 14:51:38.722	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750337497362	(З) Цена 	number	f	\N	UF_CRM_1701776871745	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266625772", "sourceFieldLabel": "Замывка АБН", "sourceSectionName": "Раздел 2"}}	101
3b24c12e-50ca-4401-b3d8-b3aca997a13f	2025-06-19 12:56:11.119	2025-06-25 14:53:05.559	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750337771016	(З) Кол-во	number	f	\N	UF_CRM_1717333167990	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266627483", "sourceFieldLabel": "Гаситель/компенсатор кол-во", "sourceSectionName": "Раздел 2"}}	105
2ed22693-bdb3-4052-90ad-29d52cd621d6	2025-06-19 12:56:13.831	2025-06-25 14:53:17.979	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750337773724	(З) Закупка	number	f	\N	UF_CRM_DEAL_AMO_KJXVYFAWBCQLXZHO	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266627796", "sourceFieldLabel": "Гаситель/компенсатор продажа", "sourceSectionName": "Раздел 2"}}	106
3af4dad7-fd49-4efe-a2a3-e9fec1500ae9	2025-06-19 12:56:16.5	2025-06-25 14:53:52.061	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750337776392	(З) Цена 	number	f	\N	UF_CRM_1701776482726	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750281502732", "sourceFieldLabel": "Покубовка цена", "sourceSectionName": "Раздел 2"}}	111
c78646b1-c493-49bb-b4b3-441e566da8fe	2025-06-19 12:56:19.066	2025-06-25 11:28:36.478	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750337778968	(З) Цена	number	f	\N	UF_CRM_1701777022069	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750281550344", "sourceFieldLabel": "Прокачка фибры цена*", "sourceSectionName": "Раздел 2"}}	115
7dc36e65-a1e9-4b36-8114-ae75d2bdd8f0	2025-06-19 12:56:21.83	2025-06-25 11:28:36.562	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750337781727	(З) Цена	number	f	\N	UF_CRM_1701777063043	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750281555558", "sourceFieldLabel": "Прокачка керамзита*", "sourceSectionName": "Раздел 2"}}	118
ac467d9e-e8db-499d-8725-808676d8f5e0	2025-06-19 13:02:12.426	2025-07-02 11:53:43.886	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750338132320	Грузоотправитель	select	f	\N	UF_CRM_1703424883476	\N	\N	[{"_id": "68651dc7511bb9b33089be0f", "label": "(5348)Бетон Экспресс", "value": "191"}, {"_id": "68651dc7511bb9b33089be10", "label": "(5351)БРУ", "value": "187"}, {"_id": "68651dc7511bb9b33089be11", "label": "(4941)ООО ТСК МОНОЛИТ", "value": "401"}, {"_id": "68651dc7511bb9b33089be12", "label": "(4587)ПроБетон СПб", "value": "186"}, {"_id": "68651dc7511bb9b33089be13", "label": "(2513)БетонПроГрупп", "value": "291"}, {"_id": "68651dc7511bb9b33089be14", "label": "(6692)Ресурс Логистик", "value": "400"}, {"_id": "68651dc7511bb9b33089be15", "label": "(6672)ЛИДЕР БЕТОН ГРУПП", "value": "417"}, {"_id": "68651dc7511bb9b33089be16", "label": "(6887)\\"ТД МОНОЛИТ\\"", "value": "418"}, {"_id": "68651dc7511bb9b33089be17", "label": "(5267)ИП КУЛАКОВ Д. Н.", "value": "419"}]	{"enabled": false}	{"enabled": false, "mappings": []}	121
5fd456e9-2426-4174-aad2-4964ab048ef8	2025-06-19 13:02:14.252	2025-06-25 11:28:36.673	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750338134144	Дилер (Контрагент)	autocomplete	f	\N	UF_CRM_1727975949	\N	\N	[]	{"source": "companies", "enabled": true}	{"enabled": false, "mappings": []}	122
40c636c5-9f51-44b1-a589-3f70f0ecbd97	2025-06-19 13:02:15.565	2025-06-25 11:28:36.686	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750338135458	Диллер контрагент (Текст)	text	f	\N	UF_CRM_1740140160976	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	123
0d9fc4d9-ebf4-4600-8dba-8acb8c2fed37	2025-06-19 13:02:16.484	2025-06-25 11:28:36.729	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750338136371	Бетон*	autocomplete	f	\N	UF_CRM_1726646101	\N	\N	[]	{"source": "catalog", "enabled": true}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750264442280", "sourceFieldLabel": "Бетон*(Покупатель)", "sourceSectionName": "Раздел 2"}}	124
9ec8cb27-bf06-4bfe-b050-d1a9298062f7	2025-06-19 13:02:17.045	2025-06-25 11:28:36.753	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750338136942	Объем 	number	f	\N	UF_CRM_1713181946618	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266620544", "sourceFieldLabel": "Объем м3", "sourceSectionName": "Раздел 2"}}	125
79c47a2b-e515-444b-8856-657113f04ac0	2025-06-19 13:02:17.362	2025-06-25 14:54:21.991	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750338137261	Цена 	number	f	\N	UF_CRM_1713181905877	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266619706", "sourceFieldLabel": "Продажа цена", "sourceSectionName": "Раздел 2"}}	126
a880a5fa-271b-472a-9f37-6391bc16c4d1	2025-06-19 13:02:17.683	2025-06-25 14:54:29.031	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750338137579	Раствор*	autocomplete	f	\N	UF_CRM_1726646140	\N	\N	[]	{"source": "catalog", "enabled": true}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266620782", "sourceFieldLabel": "Раствор*(покупатель)", "sourceSectionName": "Раздел 2"}}	127
502c94a6-465b-43e0-bcd3-7911309a8b07	2025-06-19 13:02:17.702	2025-06-25 14:54:37.076	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750338137578	Объем раствор*	number	f	\N	UF_CRM_1726646365	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266621044", "sourceFieldLabel": "Объем раствора м3", "sourceSectionName": "Раздел 2"}}	128
f9104313-08ec-4ef5-a8dd-357e35a88997	2025-06-19 13:02:17.753	2025-06-25 14:54:43.644	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750338137636	Цена раствор*	number	f	\N	UF_CRM_1726646347	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266621465", "sourceFieldLabel": "Продажа цена (раствора)", "sourceSectionName": "Раздел 2"}}	129
9bdbe3b2-ac38-4630-9803-f848fec0872a	2025-06-19 13:11:18.676	2025-06-25 14:54:50.09	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750338678598	ЦПС*	autocomplete	f	\N	UF_CRM_1726646819	\N	\N	[]	{"source": "catalog", "enabled": true}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266621254", "sourceFieldLabel": "ЦПС*(покупатель)", "sourceSectionName": "Раздел 2"}}	130
46a68efa-663a-4954-9673-503f559033d7	2025-06-19 13:11:20.129	2025-06-25 14:54:57.587	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750338680057	Объем ЦПС м3*	number	f	\N	UF_CRM_1726647247	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266621671", "sourceFieldLabel": "Объем м3 ЦПС", "sourceSectionName": "Раздел 2"}}	131
fc7c7fec-836b-4118-bb2a-49fdae0fecb0	2025-06-19 13:11:20.97	2025-06-25 14:55:03.95	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750338680896	Цена ЦПС*	number	f	\N	UF_CRM_1726647276	\N	\N	[]	{"enabled": false}	{"enabled": true, "mappings": [], "sourceField": {"sourceFieldName": "field_1750266621870", "sourceFieldLabel": "Продажа цена (ЦПС)", "sourceSectionName": "Раздел 2"}}	132
47fef949-f0e7-44a1-be55-1679081c1ee3	2025-06-20 07:40:49.345	2025-06-25 14:55:28.444	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750405249151	Простой продажа*	number	f	\N	UF_CRM_DEAL_AMO_GATVZVRPKGVWUOXB	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	133
3b5b6cc4-14d4-45c1-8ce2-1fbf20bf25c8	2025-06-20 07:46:33.482	2025-06-25 11:28:33.644	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750405593293	Телефон на объекте	text	f	\N	UF_CRM_1750419178	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	18
61bc2cf9-7aaa-46e9-b50d-2f85a19a8e20	2025-06-20 11:39:53.177	2025-06-25 11:28:34.25	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750419592990	Логистика	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	40
285c4090-b717-4b66-9ddb-619049788525	2025-06-20 11:50:41.271	2025-06-25 11:28:34.482	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750420241064	ПМД	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	48
dd2156c9-8e28-4dc9-8cf5-c3cf2dd24290	2025-06-20 11:59:42.994	2025-06-25 11:28:34.663	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750420782791	Труба	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	53
e1a6aa64-bce3-4eab-ba3b-88e4fa93a8c3	2025-06-20 12:00:47.971	2025-06-25 11:28:34.824	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750420847773	Простой АБС	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	58
53033a43-6878-412b-aab1-4f9ab83786c6	2025-06-20 12:02:04.627	2025-06-25 11:28:34.974	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750420924423	Замывка АБС	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	61
cf2a93ca-f524-42f2-92e6-421aa1cf2ee6	2025-06-20 13:35:10.315	2025-06-25 11:28:35.135	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750426510162	Перестановка АБС	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	66
25eda5bd-a81d-4b23-aef7-9415d17258db	2025-06-20 13:36:29.535	2025-06-25 11:28:35.258	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750426589386	Вибратор	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	71
d4483630-8977-4079-a93e-95b74ea72abc	2025-06-20 13:38:14.707	2025-06-25 11:28:35.458	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750426694558	КОНУС ДЛЯ ТРУБЫ	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	76
5fa52c8e-1673-4d8a-ac43-73ce4e85fea3	2025-06-20 13:39:39.309	2025-06-25 11:28:35.613	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750426779160	ДЕТАЛИ СПЕЦТЕХНИКИ	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	81
b1189f5f-5db4-492a-9af4-f30ebf01d0d7	2025-06-20 13:41:21.893	2025-06-25 11:28:35.832	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750426881714	ШЛАНГИ	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	90
dafd4c92-c258-4bec-a2cb-971d3e6e5986	2025-06-20 13:41:24.957	2025-06-25 11:28:35.903	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750426884789	ПЕРЕСТАНОВКА АБН	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	94
cb1bdd5e-e1b8-4b62-bcb5-3d2154af2815	2025-06-20 13:41:25.775	2025-06-25 11:28:36.031	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750426885607	ЗАМЫВКА АБН	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	99
fcaaf175-9d7a-4b99-b475-5bee35776eb0	2025-06-20 13:41:26.911	2025-06-25 11:28:36.213	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750426886741	ГАСИТЕЛЬ	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	104
f77efc7b-6062-4fed-bdea-a5603c3c203f	2025-06-20 13:43:45.723	2025-06-25 11:28:36.341	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750427025549	ПОКУБОВКА	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	109
a63c74f2-da44-42d6-8a9d-164e2a43df1e	2025-06-20 13:43:46.642	2025-06-25 11:28:36.471	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750427026466	ПРОКАЧКА ФИБРЫ	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	114
ff2c4ba3-97c7-4bc9-aaa4-2ff36b8cc1e0	2025-06-20 13:43:47.167	2025-06-25 11:28:36.525	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750427026995	ПРОКАЧКА КЕРАМЗИТ	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	117
dbcd0013-375e-4fa0-bafa-7e0eefc12347	2025-06-20 13:43:47.726	2025-06-25 11:28:36.651	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	section_1750427027556	НАКЛАДНЫЕ ДИЛЛЕРА	header	f	\N	\N	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	120
bd7b1d1c-3e9e-42a0-9758-19480e96b0c0	2025-06-24 18:33:26.565	2025-06-25 14:55:16.562	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790006411	Кол-во доставок 	number	f	\N	UF_CRM_1713182098653	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	134
8fa5c9e2-4ddb-4bff-9c4a-328b30baa69c	2025-06-24 18:36:02.682	2025-06-25 14:55:35.608	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790162292	Цена доставки 	number	f	\N	UF_CRM_1713182237011	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	135
a9a224f0-d837-4e4c-814e-20be3b4807d0	2025-06-24 18:36:08.297	2025-06-25 14:55:44.265	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790168143	Труба кол-во	number	f	\N	UF_CRM_1717331876913	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	136
a9ceec4b-7519-46ef-a307-75478b2cc1ee	2025-06-24 18:36:09.119	2025-06-25 14:55:49.861	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790168967	Труба цена 	number	f	\N	UF_CRM_1713184844102	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	137
74a9b122-6823-43da-811c-6174e32ba705	2025-06-24 18:36:09.282	2025-06-25 14:56:03.992	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790168969	Кол-во  Вибратор	number	f	\N	UF_CRM_1717331994332	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	138
646beacd-b376-462a-9831-b430d6642635	2025-06-24 18:36:12.143	2025-06-25 14:56:13.257	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790171996	Цена Вибратор 	number	f	\N	UF_CRM_1713182378377	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	139
3a69e10b-83db-4534-b408-4f984c709f27	2025-06-24 18:43:10.522	2025-06-25 14:56:33.236	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790590386	кол-во Замывка  	number	f	\N	UF_CRM_1717332028976	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	140
9fa9cf66-9c7f-4354-8f80-3e0451a24f20	2025-06-24 18:43:11.354	2025-06-25 11:28:37.146	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790591222	Замывка АБС (Дилер)	number	f	\N	UF_CRM_1713182402088	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	141
45724200-c1cb-43e2-a53b-7c73658287a1	2025-06-24 18:43:18.656	2025-06-25 14:57:14.307	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790598522	Цена Перестановка АБН 	number	f	\N	UF_CRM_1713182629092	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	143
280f6d5a-bad9-423c-a695-dfc2982b9ba5	2025-06-24 18:43:21.999	2025-06-25 14:57:34.697	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790601863	кол-во Гаситель 	number	f	\N	UF_CRM_1717094414402	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	144
72c17c37-d8be-41ca-97c3-4e6d45195459	2025-06-24 18:45:14.137	2025-06-25 14:57:46.708	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790714004	цена Гаситель	number	f	\N	UF_CRM_1713182678801	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	145
a6a0afe1-3222-4ae2-acab-cf49e17af97c	2025-06-24 18:45:14.982	2025-06-25 14:57:58.36	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790714848	Покубовка 	number	f	\N	UF_CRM_1713182562801	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	146
22201921-dfc3-4b4b-acf9-c3e9f7106d1a	2025-06-24 18:45:15.011	2025-06-26 05:34:38.669	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790714849	Фибра 	number	f	\N	UF_CRM_1713182699420	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	147
05f74cb4-ec3a-4705-85c1-30c62a7c77eb	2025-06-24 18:45:15.155	2025-06-25 14:58:22.964	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790715022	Керамзит	number	f	\N	UF_CRM_1713182721764	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	148
fe717f37-1f86-4413-b214-13e74ebeea8e	2025-06-24 18:45:15.519	2025-06-25 14:58:50.929	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790715385	кол-во Замывка АБН 	number	f	\N	UF_CRM_1717097716921	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	149
6e817b18-4d3e-4430-969a-b9a2a2f9a125	2025-06-24 18:45:15.538	2025-06-25 14:58:59.707	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790715396	цена Замывка АБН 	number	f	\N	UF_CRM_1713182646238	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	150
747dddd4-b25c-43e2-bee8-6c82d65abacd	2025-06-24 18:45:15.882	2025-06-25 11:28:37.421	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790715743	ПМД (Дилер)*	autocomplete	f	\N	UF_CRM_1734771126	\N	\N	[]	{"source": "catalog", "enabled": true}	{"enabled": false, "mappings": []}	151
882595cf-16bf-426e-8b61-e37430a67fe3	2025-06-24 18:45:16.224	2025-06-25 14:59:09.406	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750790716091	ПМД цена 	number	f	\N	UF_CRM_1713181837897	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	152
2f75424d-237c-4b9f-9275-1cb578130f11	2025-06-24 19:01:47.996	2025-06-25 14:59:44.403	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750791707853	Подача ч. 	number	f	\N	UF_CRM_1717096034300	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	154
6b50f296-756e-4700-89ec-efc25386413b	2025-06-24 19:01:48.967	2025-06-25 14:59:22.624	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750791708846	Кол-во часов	number	f	\N	UF_CRM_1713182524023	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	153
3218faa4-ad4e-4efe-8012-16a6eae24436	2025-06-24 19:01:48.994	2025-06-26 05:36:14.545	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750791708845	Цена часа (Дилер)	number	f	\N	UF_CRM_1713182545129	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	157
f913ad85-4b8c-4ab3-b4a0-7d1f6faa5bb0	2025-06-24 19:01:49.038	2025-06-26 05:36:03.695	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750791708844	кол-во Перестановка 	number	f	\N	UF_CRM_1717332070924	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	155
ea3539af-86b9-49c8-a280-d91676ad45e0	2025-06-24 19:01:49.895	2025-06-26 05:36:01.669	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750791709769	цена  Перестановка АБС 	number	f	\N	UF_CRM_1740667604487	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	156
bc1fa672-3708-47d2-9dbf-451cbfa54f64	2025-06-25 11:28:16.107	2025-06-26 05:36:23.855	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750850896051	Шланги (Дилер)	number	f	\N	UF_CRM_1713182595379	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	158
39e5ff44-607e-45a0-8a40-984959713028	2025-06-27 09:11:56.717	2025-06-27 09:12:36.97	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1751015516517	(З) Цена	number	f	\N	UF_CRM_1701770173651	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	55
a17e7a55-9a2e-4496-a5a5-0c164c244839	2025-06-18 17:13:59.546	2025-06-25 11:28:33.29	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266838846	Менеджер для заявки(тех.)	select	f	\N	UF_CRM_1749373742	\N	\N	[{"_id": "6852f3f0a695cfad7fcb4814", "label": "Анастасия Воркова", "value": "402"}, {"_id": "6852f3f0a695cfad7fcb4815", "label": "Елена Грибанькова", "value": "403"}, {"_id": "6852f3f0a695cfad7fcb4816", "label": "Сергей Банщиков", "value": "404"}, {"_id": "6852f3f0a695cfad7fcb4817", "label": "Никита Каштанов", "value": "405"}, {"_id": "6852f3f0a695cfad7fcb4818", "label": "Юлия Папко", "value": "406"}, {"_id": "e775bc7af473221028189024", "label": "Дмитрий Мошков", "value": "422"}, {"_id": "359730ac8c371e224fec6712", "label": "Никита Челюскин", "value": "421"}]	{"enabled": false}	{"enabled": false, "mappings": []}	3
576279b4-7311-49b9-a1fe-031771d1fab2	2025-06-18 17:07:20.028	2025-08-17 12:49:56.735114	d2fcd5ad-6ab7-4350-a13c-0c91230cc9a7	\N	field_1750266439749	Название	text	t	\N	TITLE	\N	\N	[]	{"enabled": false}	{"enabled": false, "mappings": []}	2
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
1	1754839690000	FixSubmissionHistoryActionType1754839690000
2	1754935600000	ActivateAllUsers1754935600000
3	1755554000000	AddFormDataColumn1755554000000
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: beton_user
--

COPY public.settings (id, created_at, updated_at, key, value, category, description, is_public, is_encrypted, validation, metadata) FROM stdin;
54233fe4-34da-45ea-aa7c-8c048f385b53	2025-08-10 20:37:14.614624	2025-08-10 20:37:14.614624	submissions.enable_copying	true	system	Разрешить копирование заявок пользователями	t	f	\N	\N
da09c05b-fcf7-46d3-8048-4296adf2a938	2025-08-10 20:37:14.632705	2025-08-10 20:37:14.632705	submissions.copy_button_text	"Копировать заявку"	ui	Текст кнопки копирования заявки	t	f	\N	\N
29333854-0ab3-4b0e-9ce5-d6f13542c0e1	2025-08-10 20:37:14.639176	2025-08-10 20:37:14.639176	submissions.allow_user_status_change	true	system	Разрешить пользователям изменять статус своих заявок	t	f	\N	\N
cd645ab4-e4a6-457f-ab06-dfa2d1327c94	2025-08-10 20:37:14.645095	2025-08-10 20:37:14.645095	submissions.allow_user_edit	true	system	Разрешить пользователям редактировать свои заявки	t	f	\N	\N
65275d12-abd8-4351-9ad4-6b53618320aa	2025-08-10 20:37:14.650409	2025-08-10 20:37:14.650409	forms.auto_save_interval	30000	system	Интервал автосохранения форм в миллисекундах	f	f	{"max": 300000, "min": 5000, "type": "number"}	\N
e1a2a9d3-17e5-4782-984a-9643aba9df5b	2025-08-10 20:37:14.655626	2025-08-10 20:37:14.655626	ui.theme_mode	"light"	ui	Режим темы интерфейса (light/dark/auto)	t	f	{"enum": ["light", "dark", "auto"], "type": "string"}	\N
baaa0644-5275-4ad0-9ee6-9b4e107704dd	2025-08-10 20:37:14.660571	2025-08-10 20:37:14.660571	system.debug_mode	false	system	Режим отладки для разработчиков	f	f	{"type": "boolean"}	\N
\.


--
-- Data for Name: submission_history; Type: TABLE DATA; Schema: public; Owner: beton_user
--

COPY public.submission_history (id, created_at, updated_at, submission_id, user_id, action_type, description, changes, metadata) FROM stdin;
94d36539-f295-4c63-96c9-e677d196afb7	2025-08-17 14:23:20.605321	2025-08-17 14:23:20.605321	0ff3fd08-4fe3-4e56-85c5-58d81029996b	11ef9f6c-f0de-4606-92ef-fcc5159c8e7c	create	Заявка создана	\N	\N
8a92ad0e-8813-4f8b-8800-cd67c1269cd0	2025-08-17 14:23:22.691123	2025-08-17 14:23:22.691123	0ff3fd08-4fe3-4e56-85c5-58d81029996b	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20002)	\N	{"bitrixDealId": "20002"}
16cb925f-8382-4ce7-b849-b82842576fcb	2025-08-17 14:25:08.229061	2025-08-17 14:25:08.229061	0ff3fd08-4fe3-4e56-85c5-58d81029996b	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
3e3038e4-d882-4126-87ff-716336f2219d	2025-08-17 14:25:16.89984	2025-08-17 14:25:16.89984	0ff3fd08-4fe3-4e56-85c5-58d81029996b	11ef9f6c-f0de-4606-92ef-fcc5159c8e7c	update	Заявка обновлена	[{"field": "title", "newValue": "Тест1", "oldValue": "Тест"}]	\N
15700ef3-ed0a-4cea-b2c6-1569f95f5ee8	2025-08-17 14:25:16.907388	2025-08-17 14:25:16.907388	0ff3fd08-4fe3-4e56-85c5-58d81029996b	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
acd5854a-c2b2-4500-baf5-a3db5fa91074	2025-08-17 14:25:17.61992	2025-08-17 14:25:17.61992	0ff3fd08-4fe3-4e56-85c5-58d81029996b	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
1a9c116f-01c3-4342-83ff-92f893c7b49b	2025-08-17 14:26:48.797678	2025-08-17 14:26:48.797678	0ff3fd08-4fe3-4e56-85c5-58d81029996b	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
009f0dbb-c998-48ea-ae5e-86f2848a49e0	2025-08-17 14:34:21.887672	2025-08-17 14:34:21.887672	0ff3fd08-4fe3-4e56-85c5-58d81029996b	\N	status_change	Статус изменен с "C1:NEW" на "C1:UC_GJLIZP"	[{"field": "status", "newValue": "C1:UC_GJLIZP", "oldValue": "C1:NEW"}]	\N
6604500b-cf98-4b6e-a7ed-72de7d876d90	2025-08-17 14:34:21.896711	2025-08-17 14:34:21.896711	0ff3fd08-4fe3-4e56-85c5-58d81029996b	\N	comment	Автоматическое обновление через внешний API	\N	\N
6d5e6622-4513-42ea-be1e-addc5a93e85f	2025-08-17 17:22:47.229913	2025-08-17 17:22:47.229913	0ff3fd08-4fe3-4e56-85c5-58d81029996b	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
21cd9aea-522d-4753-b488-75953a9cb21e	2025-08-17 17:23:21.35955	2025-08-17 17:23:21.35955	e4d511e6-97e0-41ae-b6c8-d3c133e82fa7	c8805027-9e4e-433a-8a7d-e39345eb98e5	create	Заявка создана	\N	\N
e8a56e28-6a3d-4d0a-91d0-ad4f3ca3e64c	2025-08-17 17:23:23.226998	2025-08-17 17:23:23.226998	e4d511e6-97e0-41ae-b6c8-d3c133e82fa7	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20007)	\N	{"bitrixDealId": "20007"}
7eb884d1-7cee-4025-ae9e-c40f936bc70a	2025-08-18 08:22:26.21553	2025-08-18 08:22:26.21553	0084907d-532c-40d4-8a3b-30e580d969be	b4c39023-7327-4047-862e-ce584727654e	create	Заявка создана	\N	\N
8753f0cd-2eef-47c5-b959-f9a4cdef18b9	2025-08-18 08:22:28.042038	2025-08-18 08:22:28.042038	0084907d-532c-40d4-8a3b-30e580d969be	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20008)	\N	{"bitrixDealId": "20008"}
1571d91b-2259-4c92-b639-e6405737065c	2025-08-18 08:23:59.523968	2025-08-18 08:23:59.523968	0084907d-532c-40d4-8a3b-30e580d969be	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
e804ba61-87ef-4eba-9e97-6c8b36cf01e9	2025-08-18 08:41:40.228595	2025-08-18 08:41:40.228595	839c5ea9-eb24-4d0d-bbda-3e643aa2ad6a	8bd5e5ce-4b5d-4a67-a588-9418ebc3f0bd	create	Заявка создана	\N	\N
309af5bb-0237-4e37-98be-ba3391943f2f	2025-08-18 08:41:42.72197	2025-08-18 08:41:42.72197	839c5ea9-eb24-4d0d-bbda-3e643aa2ad6a	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20011)	\N	{"bitrixDealId": "20011"}
85010e2f-4e76-48e0-924c-2ca2b30c8f20	2025-08-18 08:43:03.522581	2025-08-18 08:43:03.522581	839c5ea9-eb24-4d0d-bbda-3e643aa2ad6a	\N	status_change	Статус изменен с "C1:NEW" на "C1:UC_GJLIZP"	[{"field": "status", "newValue": "C1:UC_GJLIZP", "oldValue": "C1:NEW"}]	\N
a2b4c405-e552-48d1-9371-74a0dfc9d080	2025-08-18 08:43:03.534533	2025-08-18 08:43:03.534533	839c5ea9-eb24-4d0d-bbda-3e643aa2ad6a	\N	comment	Автоматическое обновление через внешний API	\N	\N
f9bf783d-f30c-42b5-b26b-01291770f625	2025-08-18 08:48:40.491679	2025-08-18 08:48:40.491679	632b8fb0-d520-4ac2-afe7-937b1b88ade6	46dbb049-fec4-4895-a901-a009db782bcd	create	Заявка создана	\N	\N
032aee1f-a513-43ae-8eaf-bdd336eb18a2	2025-08-18 08:48:42.269613	2025-08-18 08:48:42.269613	632b8fb0-d520-4ac2-afe7-937b1b88ade6	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20013)	\N	{"bitrixDealId": "20013"}
61426a1f-aea0-4725-9f9e-7ea287bfcd1f	2025-08-18 08:48:51.939007	2025-08-18 08:48:51.939007	632b8fb0-d520-4ac2-afe7-937b1b88ade6	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
b7c18737-5b0a-41b5-a4f2-159e7f4a6aba	2025-08-18 08:52:13.848785	2025-08-18 08:52:13.848785	632b8fb0-d520-4ac2-afe7-937b1b88ade6	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
062de4c7-9f6d-4075-871e-1e837e77019e	2025-08-18 08:52:14.538841	2025-08-18 08:52:14.538841	632b8fb0-d520-4ac2-afe7-937b1b88ade6	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
c28b745a-c547-49d8-a7db-9d9018c86597	2025-08-18 08:53:14.391638	2025-08-18 08:53:14.391638	632b8fb0-d520-4ac2-afe7-937b1b88ade6	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
14018ea9-d09b-427d-b0da-d70944ac3050	2025-08-18 09:15:47.656478	2025-08-18 09:15:47.656478	450fb511-ccfd-4b10-983e-5b7602027d7a	b3eb8703-8a30-4903-afe1-db027f794bb3	create	Заявка создана	\N	\N
c7580ce4-452a-47e5-b572-c4612f10713c	2025-08-18 09:15:49.649912	2025-08-18 09:15:49.649912	450fb511-ccfd-4b10-983e-5b7602027d7a	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20014)	\N	{"bitrixDealId": "20014"}
2e841f56-859e-4c04-b2d4-7f575067b108	2025-08-18 09:25:17.218571	2025-08-18 09:25:17.218571	632b8fb0-d520-4ac2-afe7-937b1b88ade6	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
d29bbe20-1321-4c0b-9c41-8d31a3600677	2025-08-18 09:34:27.477449	2025-08-18 09:34:27.477449	846e6528-9df7-47bf-804a-ccbc5ca45c73	d1846524-209f-4058-89ae-05832d5ebc4f	create	Заявка создана	\N	\N
1ac9ded4-33ce-4f7a-8897-cdbb4069a172	2025-08-18 09:34:29.047199	2025-08-18 09:34:29.047199	846e6528-9df7-47bf-804a-ccbc5ca45c73	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20022)	\N	{"bitrixDealId": "20022"}
0854ca5a-ef96-491f-a48f-638a873b54c4	2025-08-18 10:12:49.439322	2025-08-18 10:12:49.439322	450fb511-ccfd-4b10-983e-5b7602027d7a	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
0c932458-6a93-49f1-998d-663becf8f093	2025-08-18 18:23:35.151181	2025-08-18 18:23:35.151181	450fb511-ccfd-4b10-983e-5b7602027d7a	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
94d0ae75-6910-4a8b-b0ee-994e0e5b3231	2025-08-18 18:23:40.067041	2025-08-18 18:23:40.067041	632b8fb0-d520-4ac2-afe7-937b1b88ade6	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
3545faa5-8371-4b65-8305-c82931f244a2	2025-08-18 19:42:44.761897	2025-08-18 19:42:44.761897	632b8fb0-d520-4ac2-afe7-937b1b88ade6	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
25c6bf77-fd5c-4577-bc6d-384676f1b056	2025-08-18 20:14:24.068945	2025-08-18 20:14:24.068945	0084907d-532c-40d4-8a3b-30e580d969be	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
5d1f60c4-d31f-4374-9a2c-55154cb92fb5	2025-08-22 16:52:29.874812	2025-08-22 16:52:29.874812	450fb511-ccfd-4b10-983e-5b7602027d7a	\N	sync_bitrix	Ошибка синхронизации с Bitrix24: Request failed with status code 400	\N	{"error": "Request failed with status code 400"}
b802213c-b8c4-4e7d-ac4f-5cfc9e459e3f	2025-08-25 08:41:08.206926	2025-08-25 08:41:08.206926	bc4f5a58-0794-4268-98dd-135228664442	88f7a113-202e-457f-80bf-4ddfa0450642	create	Заявка создана	\N	\N
77af44c8-7f3e-4c21-a841-b7715e2f6aa5	2025-08-25 08:41:10.445805	2025-08-25 08:41:10.445805	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20122)	\N	{"bitrixDealId": "20122"}
cf8384b2-a38e-4067-b336-432181ec65bb	2025-08-25 08:41:37.358002	2025-08-25 08:41:37.358002	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
fb113379-8216-4e5d-8010-28b409bc2374	2025-08-25 08:51:32.517203	2025-08-25 08:51:32.517203	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
fc860586-0170-459c-97d7-429f01e45902	2025-08-25 08:51:33.321824	2025-08-25 08:51:33.321824	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
a9b3dfd3-b0f9-43e2-b88f-281e18e24ec6	2025-08-25 08:52:43.023756	2025-08-25 08:52:43.023756	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
b881f333-79fe-4b84-8325-e169172ee103	2025-08-25 08:54:19.901941	2025-08-25 08:54:19.901941	bde431b7-abae-404b-a60a-ed359e09858c	c8805027-9e4e-433a-8a7d-e39345eb98e5	create	Заявка создана	\N	\N
869352ff-e668-45c2-a42f-081652bc7b80	2025-08-25 08:54:21.286194	2025-08-25 08:54:21.286194	bde431b7-abae-404b-a60a-ed359e09858c	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20125)	\N	{"bitrixDealId": "20125"}
a1d5998d-5fd8-4a05-af52-6457e45e9977	2025-08-25 08:55:47.905009	2025-08-25 08:55:47.905009	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
d475678b-0980-4cac-922f-2237b0041e35	2025-08-25 08:58:26.683932	2025-08-25 08:58:26.683932	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
0decdff5-c347-4f69-9de6-4837804dc71a	2025-08-25 09:07:11.556374	2025-08-25 09:07:11.556374	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
cd1b7352-982c-4edd-b013-a5979b3dadcb	2025-08-25 09:08:34.599289	2025-08-25 09:08:34.599289	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
76dc7853-0069-4146-96e4-e916b41e3d57	2025-08-25 09:08:35.450129	2025-08-25 09:08:35.450129	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
d69cc43c-e016-4537-a9e3-0fa3d24615aa	2025-08-25 09:10:01.716627	2025-08-25 09:10:01.716627	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
c3d1e042-47b5-4da7-98a6-ea7521c22646	2025-08-25 09:10:02.860649	2025-08-25 09:10:02.860649	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
270a53f1-2d62-45c4-9ed0-1a2c60c65ea9	2025-08-25 09:16:44.612725	2025-08-25 09:16:44.612725	046715ac-63e8-44e0-b188-c5d49c89160c	1fdddcec-b1ea-4cce-b4f1-f945501383a0	create	Заявка создана	\N	\N
107e6cb9-7574-42c1-a36c-bdb1ab7f0cac	2025-08-25 09:16:46.833262	2025-08-25 09:16:46.833262	046715ac-63e8-44e0-b188-c5d49c89160c	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20126)	\N	{"bitrixDealId": "20126"}
c7a25ba7-ea15-4950-8462-f3d061f76cbb	2025-08-25 09:17:00.008667	2025-08-25 09:17:00.008667	046715ac-63e8-44e0-b188-c5d49c89160c	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
8aa71e19-bf4f-498c-b282-98a4cf1a390b	2025-08-25 09:18:25.928614	2025-08-25 09:18:25.928614	046715ac-63e8-44e0-b188-c5d49c89160c	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
f8a8bff9-dc46-4cbc-b7da-0f1eda3a0f1e	2025-08-25 09:18:26.72475	2025-08-25 09:18:26.72475	046715ac-63e8-44e0-b188-c5d49c89160c	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
dfbd8429-080e-44ca-b7a8-298e276d26e2	2025-08-25 09:27:01.438213	2025-08-25 09:27:01.438213	046715ac-63e8-44e0-b188-c5d49c89160c	\N	status_change	Статус изменен с "C1:NEW" на "C1:UC_GJLIZP"	[{"field": "status", "newValue": "C1:UC_GJLIZP", "oldValue": "C1:NEW"}]	\N
210cec76-cbc4-427c-afbd-c999f7ee903e	2025-08-25 09:27:01.462201	2025-08-25 09:27:01.462201	046715ac-63e8-44e0-b188-c5d49c89160c	\N	comment	Автоматическое обновление через внешний API	\N	\N
507470e6-ed33-4a0b-bee1-4a23a6aa3d53	2025-08-25 09:28:18.488826	2025-08-25 09:28:18.488826	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
dc96c17f-6c53-4be4-9cdd-fa0a7d263cfa	2025-08-25 09:31:05.077031	2025-08-25 09:31:05.077031	632b8fb0-d520-4ac2-afe7-937b1b88ade6	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
685f0044-bae0-41ca-b7f1-06567c3032b3	2025-08-25 09:31:36.229012	2025-08-25 09:31:36.229012	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
14ebede7-485b-4443-b1f7-7aa87734c2a9	2025-08-25 10:40:24.665067	2025-08-25 10:40:24.665067	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
01063c3f-5fff-49d2-9b78-409aced13564	2025-08-25 10:40:52.783568	2025-08-25 10:40:52.783568	f083ff3c-21e1-4182-b744-044bd94d5439	c8805027-9e4e-433a-8a7d-e39345eb98e5	create	Заявка создана	\N	\N
41a15b0f-4f05-47f3-b512-0a1915595017	2025-08-25 10:40:55.180144	2025-08-25 10:40:55.180144	f083ff3c-21e1-4182-b744-044bd94d5439	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20130)	\N	{"bitrixDealId": "20130"}
079a0270-8a95-4ac7-81ca-a29e12540e60	2025-08-25 10:42:26.465994	2025-08-25 10:42:26.465994	f083ff3c-21e1-4182-b744-044bd94d5439	c8805027-9e4e-433a-8a7d-e39345eb98e5	status_change	Статус изменен с "C1:NEW" на "C1:UC_GJLIZP"	[{"field": "status", "newValue": "C1:UC_GJLIZP", "oldValue": "C1:NEW"}]	\N
e4ca4ba0-d891-4163-bc4d-37f021325a9d	2025-08-25 10:42:28.483121	2025-08-25 10:42:28.483121	f083ff3c-21e1-4182-b744-044bd94d5439	\N	status_change	Статус изменен с "C1:UC_GJLIZP" на "C1:UC_GJLIZP"	[{"field": "status", "newValue": "C1:UC_GJLIZP", "oldValue": "C1:UC_GJLIZP"}]	\N
825a120d-5b9d-4182-a5e6-e317d1e2428f	2025-08-25 10:42:28.489276	2025-08-25 10:42:28.489276	f083ff3c-21e1-4182-b744-044bd94d5439	\N	comment	Автоматическое обновление через внешний API	\N	\N
60fe0dd7-0fe8-4d12-bee3-a6599222cbeb	2025-08-25 10:42:28.553109	2025-08-25 10:42:28.553109	f083ff3c-21e1-4182-b744-044bd94d5439	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
e8d0eb76-650d-4089-8d34-f048e2f0d0e4	2025-08-25 11:03:14.097426	2025-08-25 11:03:14.097426	50c3dd9c-9e6a-4fa6-89e1-17b92a055c82	fc01fff1-9401-4df8-9703-f84f686e461c	create	Заявка создана	\N	\N
c9cf0d0f-d302-4b44-81a0-b578c484d683	2025-08-25 11:03:17.037414	2025-08-25 11:03:17.037414	50c3dd9c-9e6a-4fa6-89e1-17b92a055c82	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20132)	\N	{"bitrixDealId": "20132"}
8baabc39-88ef-4af5-8d52-e9d5af2453ec	2025-08-25 11:04:44.039334	2025-08-25 11:04:44.039334	50c3dd9c-9e6a-4fa6-89e1-17b92a055c82	fc01fff1-9401-4df8-9703-f84f686e461c	status_change	Статус изменен с "C1:NEW" на "C1:UC_GJLIZP"	[{"field": "status", "newValue": "C1:UC_GJLIZP", "oldValue": "C1:NEW"}]	\N
417f3195-f569-452e-b66a-e734e5b1e7b3	2025-08-25 11:04:49.195757	2025-08-25 11:04:49.195757	50c3dd9c-9e6a-4fa6-89e1-17b92a055c82	\N	status_change	Статус изменен с "C1:UC_GJLIZP" на "C1:UC_GJLIZP"	[{"field": "status", "newValue": "C1:UC_GJLIZP", "oldValue": "C1:UC_GJLIZP"}]	\N
9bc70377-e4d1-4428-a994-0e08f50de38d	2025-08-25 11:04:49.201001	2025-08-25 11:04:49.201001	50c3dd9c-9e6a-4fa6-89e1-17b92a055c82	\N	comment	Автоматическое обновление через внешний API	\N	\N
8b83ea96-4881-4f67-a1d2-b3463364997c	2025-08-25 11:04:49.249326	2025-08-25 11:04:49.249326	50c3dd9c-9e6a-4fa6-89e1-17b92a055c82	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
43493f6a-f8cc-4946-af11-4eeef82ff097	2025-08-25 11:07:56.807621	2025-08-25 11:07:56.807621	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
8d463b9a-266d-4d24-884e-cdc0770001fd	2025-08-25 11:08:13.165258	2025-08-25 11:08:13.165258	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
0ae8e398-ff80-4cd9-81e3-1ef5163678e6	2025-08-25 11:08:13.952994	2025-08-25 11:08:13.952994	bc4f5a58-0794-4268-98dd-135228664442	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
116c9801-2be2-43c3-9ad1-244f722d5203	2025-08-25 11:09:37.596846	2025-08-25 11:09:37.596846	50c3dd9c-9e6a-4fa6-89e1-17b92a055c82	\N	status_change	Статус изменен с "C1:UC_GJLIZP" на "C1:UC_GJLIZP"	[{"field": "status", "newValue": "C1:UC_GJLIZP", "oldValue": "C1:UC_GJLIZP"}]	\N
989c2fce-125b-4ff3-ad28-bd644e529800	2025-08-25 11:09:37.611855	2025-08-25 11:09:37.611855	50c3dd9c-9e6a-4fa6-89e1-17b92a055c82	\N	comment	Автоматическое обновление через внешний API	\N	\N
73ee2783-cd77-4dfb-b00b-20462c50373f	2025-08-25 11:10:49.598369	2025-08-25 11:10:49.598369	50c3dd9c-9e6a-4fa6-89e1-17b92a055c82	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
f03b07e7-3b14-4c02-9c20-800a9b088526	2025-08-25 11:32:25.907821	2025-08-25 11:32:25.907821	a0e0304d-ef05-4dc1-91d5-9ff7cdb61adb	88f7a113-202e-457f-80bf-4ddfa0450642	create	Заявка создана	\N	\N
97ff78da-8b62-4f4e-ae76-bf8134faf493	2025-08-25 11:32:28.158931	2025-08-25 11:32:28.158931	a0e0304d-ef05-4dc1-91d5-9ff7cdb61adb	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20134)	\N	{"bitrixDealId": "20134"}
4fe18aa9-5bd8-4f65-8cb0-62297a1272dc	2025-08-25 11:32:48.234605	2025-08-25 11:32:48.234605	a0e0304d-ef05-4dc1-91d5-9ff7cdb61adb	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
a01b2171-b3f4-4a9e-93bc-cf21297ff1cb	2025-08-25 11:35:14.532404	2025-08-25 11:35:14.532404	a0e0304d-ef05-4dc1-91d5-9ff7cdb61adb	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
4922ffd0-819c-42e3-9cd8-1128338ace27	2025-08-25 11:35:15.363592	2025-08-25 11:35:15.363592	a0e0304d-ef05-4dc1-91d5-9ff7cdb61adb	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
8b48647e-2f60-4183-a583-d3178e8772cc	2025-08-25 11:38:01.043529	2025-08-25 11:38:01.043529	a0e0304d-ef05-4dc1-91d5-9ff7cdb61adb	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
a0dba930-4ad9-410f-9a58-1d3510570434	2025-08-25 11:38:01.979525	2025-08-25 11:38:01.979525	a0e0304d-ef05-4dc1-91d5-9ff7cdb61adb	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
da03cbfb-b7b2-401b-9baa-2d78edf73da9	2025-08-25 11:49:11.260892	2025-08-25 11:49:11.260892	a0e0304d-ef05-4dc1-91d5-9ff7cdb61adb	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
9bae8981-216d-47ae-bdac-4bcf1b7a3537	2025-08-25 11:49:12.093679	2025-08-25 11:49:12.093679	a0e0304d-ef05-4dc1-91d5-9ff7cdb61adb	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
74912bfa-cbb8-4a68-b14c-5d447c1e523a	2025-08-25 11:56:19.482029	2025-08-25 11:56:19.482029	a0e0304d-ef05-4dc1-91d5-9ff7cdb61adb	88f7a113-202e-457f-80bf-4ddfa0450642	status_change	Статус изменен с "C1:NEW" на "C1:UC_GJLIZP"	[{"field": "status", "newValue": "C1:UC_GJLIZP", "oldValue": "C1:NEW"}]	\N
6e4c5bec-3b5e-4175-91e5-c5ad5bc82876	2025-08-25 11:56:24.106574	2025-08-25 11:56:24.106574	a0e0304d-ef05-4dc1-91d5-9ff7cdb61adb	\N	status_change	Статус изменен с "C1:UC_GJLIZP" на "C1:UC_GJLIZP"	[{"field": "status", "newValue": "C1:UC_GJLIZP", "oldValue": "C1:UC_GJLIZP"}]	\N
64a4eaa2-714d-41ad-a922-6c9e29b5cca8	2025-08-25 11:56:24.113225	2025-08-25 11:56:24.113225	a0e0304d-ef05-4dc1-91d5-9ff7cdb61adb	\N	comment	Автоматическое обновление через внешний API	\N	\N
2317d78c-5d7f-46c8-94c1-5c686197c2d7	2025-08-25 11:56:24.15567	2025-08-25 11:56:24.15567	a0e0304d-ef05-4dc1-91d5-9ff7cdb61adb	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
feb0b68f-189f-47a8-94e5-abf5dc5ce02b	2025-08-25 12:03:33.543436	2025-08-25 12:03:33.543436	6f6281ca-830a-4692-8a42-d2056c790c5c	fc01fff1-9401-4df8-9703-f84f686e461c	create	Заявка создана	\N	\N
270e6e29-ed26-4c86-80a0-3ea53e32468b	2025-08-25 12:03:35.675898	2025-08-25 12:03:35.675898	6f6281ca-830a-4692-8a42-d2056c790c5c	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20136)	\N	{"bitrixDealId": "20136"}
21e717af-c91e-4a25-8d90-88184bfbecf3	2025-08-25 12:04:17.764718	2025-08-25 12:04:17.764718	6f6281ca-830a-4692-8a42-d2056c790c5c	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
9c0dffe8-84a6-461d-8d2a-1657aa4db26f	2025-08-25 12:05:10.38483	2025-08-25 12:05:10.38483	6f6281ca-830a-4692-8a42-d2056c790c5c	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
602e3702-5de9-4289-a6ec-48a74489b0b7	2025-08-25 12:05:11.16463	2025-08-25 12:05:11.16463	6f6281ca-830a-4692-8a42-d2056c790c5c	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
dcfde0e6-40c3-444a-8d9f-d599b4bb9070	2025-08-25 12:05:49.748209	2025-08-25 12:05:49.748209	6f6281ca-830a-4692-8a42-d2056c790c5c	fc01fff1-9401-4df8-9703-f84f686e461c	status_change	Статус изменен с "C1:NEW" на "C1:UC_GJLIZP"	[{"field": "status", "newValue": "C1:UC_GJLIZP", "oldValue": "C1:NEW"}]	\N
988ecfdd-cdbd-439c-8502-43d545f5b1d2	2025-08-25 12:05:54.455107	2025-08-25 12:05:54.455107	6f6281ca-830a-4692-8a42-d2056c790c5c	\N	status_change	Статус изменен с "C1:UC_GJLIZP" на "C1:UC_GJLIZP"	[{"field": "status", "newValue": "C1:UC_GJLIZP", "oldValue": "C1:UC_GJLIZP"}]	\N
8e89ca0e-285a-448e-a1f2-00f4cf0ee1e4	2025-08-25 12:05:54.46096	2025-08-25 12:05:54.46096	6f6281ca-830a-4692-8a42-d2056c790c5c	\N	comment	Автоматическое обновление через внешний API	\N	\N
785c7607-46af-4a13-8e1b-67088532af46	2025-08-25 12:05:54.522736	2025-08-25 12:05:54.522736	6f6281ca-830a-4692-8a42-d2056c790c5c	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: undefined)	\N	{}
b69ad644-1cbc-42c2-b281-d43b321da58c	2025-08-25 13:24:30.242393	2025-08-25 13:24:30.242393	62cf98d0-12c3-4fcf-845c-67b30f934c66	42791e1c-fa78-44ae-aa2e-632226f460ab	create	Заявка создана	\N	\N
8fbe3f24-5d8c-45b8-a609-38c1fce65137	2025-08-25 13:24:31.971714	2025-08-25 13:24:31.971714	62cf98d0-12c3-4fcf-845c-67b30f934c66	\N	sync_bitrix	Синхронизация с Bitrix24 успешна (ID: 20139)	\N	{"bitrixDealId": "20139"}
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
62cf98d0-12c3-4fcf-845c-67b30f934c66	202508251312	55c70b46-a204-4fd3-8e93-9abc078ab8aa	42791e1c-fa78-44ae-aa2e-632226f460ab	Заявка 1756128270226	C1:NEW	medium	\N	Заявка создана через форму	{}	20139	\N	synced	\N	1	2	crm@betonexpress.pro	\N	2025-08-25 13:24:30.231985	2025-08-25 13:24:31.968396	\N	1	8	2025	\N	\N	{}
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
42791e1c-fa78-44ae-aa2e-632226f460ab	crm@betonexpress.pro	$2b$10$VHxWWlQGgJ85XMo2ztPi5OQnQ6wnG9OxGJ1.RSjI1fH8a/984d0ge	crm	Administrator		admin	active	t	{"onlyMyCompanies": true}	1	2025-08-25 13:24:12.252	2025-06-14 10:54:17.723	2025-08-25 13:24:12.253551
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

SELECT pg_catalog.setval('public.migrations_id_seq', 3, true);


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
-- Name: settings PK_0669fe20e252eb692bf4d344975; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY (id);


--
-- Name: submission_history PK_117f7e255b4beed18f4ee98d369; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.submission_history
    ADD CONSTRAINT "PK_117f7e255b4beed18f4ee98d369" PRIMARY KEY (id);


--
-- Name: admin_tokens PK_1b8fe3dbc19bbe91baa16ab6b09; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.admin_tokens
    ADD CONSTRAINT "PK_1b8fe3dbc19bbe91baa16ab6b09" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: form_fields PK_dc4b73290f2926c3a7d7c92d1e1; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.form_fields
    ADD CONSTRAINT "PK_dc4b73290f2926c3a7d7c92d1e1" PRIMARY KEY (id);


--
-- Name: submissions UQ_6b7b1d9d55a575b557c3a848bdb; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT "UQ_6b7b1d9d55a575b557c3a848bdb" UNIQUE (submission_number);


--
-- Name: forms UQ_86b3e19794ca9b548ab505de60d; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT "UQ_86b3e19794ca9b548ab505de60d" UNIQUE (name);


--
-- Name: admin_tokens UQ_8a45fc9ecc8373746567c65d4c0; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.admin_tokens
    ADD CONSTRAINT "UQ_8a45fc9ecc8373746567c65d4c0" UNIQUE (token);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: settings UQ_c8639b7626fa94ba8265628f214; Type: CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT "UQ_c8639b7626fa94ba8265628f214" UNIQUE (key);


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
-- Name: IDX_1755f90c28c340d9c1e80d3439; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_1755f90c28c340d9c1e80d3439" ON public.submissions USING btree (assigned_to_id, status, created_at);


--
-- Name: IDX_20c7aea6112bef71528210f631; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_20c7aea6112bef71528210f631" ON public.users USING btree (is_active);


--
-- Name: IDX_23d4b380540ea7fe12f0fbf56e; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_23d4b380540ea7fe12f0fbf56e" ON public.form_fields USING btree (form_id, "order");


--
-- Name: IDX_28f1a218cd20cf7f1e218c5dc2; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_28f1a218cd20cf7f1e218c5dc2" ON public.submissions USING btree (user_email, status);


--
-- Name: IDX_2a9cf5daab7117d26ac65b7027; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_2a9cf5daab7117d26ac65b7027" ON public.settings USING btree (category);


--
-- Name: IDX_2cc0aa3a44e03edec13874c217; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_2cc0aa3a44e03edec13874c217" ON public.submissions USING btree (form_name, created_at);


--
-- Name: IDX_302bc58f05e57b971dafad21dc; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_302bc58f05e57b971dafad21dc" ON public.submissions USING btree (status, created_at);


--
-- Name: IDX_5129229bcc3a55949e494aa3d5; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_5129229bcc3a55949e494aa3d5" ON public.submissions USING btree (bitrix_sync_status, created_at);


--
-- Name: IDX_51be0fb9b4dae26a52326a3ad8; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_51be0fb9b4dae26a52326a3ad8" ON public.submissions USING btree (form_id, created_at);


--
-- Name: IDX_654ca06758430c56ab906852e4; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_654ca06758430c56ab906852e4" ON public.form_fields USING btree (form_id, section_id, "order");


--
-- Name: IDX_6b7b1d9d55a575b557c3a848bd; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE UNIQUE INDEX "IDX_6b7b1d9d55a575b557c3a848bd" ON public.submissions USING btree (submission_number);


--
-- Name: IDX_7284b9f135db6f9fe3e95f2554; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_7284b9f135db6f9fe3e95f2554" ON public.admin_tokens USING btree (user_id);


--
-- Name: IDX_73936e0a4fc14f01d543be60cb; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_73936e0a4fc14f01d543be60cb" ON public.submissions USING btree (priority, status);


--
-- Name: IDX_7a0e3f6c32bd569d4dc06103e9; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_7a0e3f6c32bd569d4dc06103e9" ON public.form_fields USING btree (name, form_id);


--
-- Name: IDX_7bd879d7fd42288f41f95cce35; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_7bd879d7fd42288f41f95cce35" ON public.forms USING btree (is_active);


--
-- Name: IDX_86b3e19794ca9b548ab505de60; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE UNIQUE INDEX "IDX_86b3e19794ca9b548ab505de60" ON public.forms USING btree (name);


--
-- Name: IDX_8a45fc9ecc8373746567c65d4c; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE UNIQUE INDEX "IDX_8a45fc9ecc8373746567c65d4c" ON public.admin_tokens USING btree (token);


--
-- Name: IDX_90def9e2333543f1caff824161; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_90def9e2333543f1caff824161" ON public.submissions USING btree (user_id, status, created_at);


--
-- Name: IDX_97672ac88f789774dd47f7c8be; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON public.users USING btree (email);


--
-- Name: IDX_a5d1c41a29ff1027763a9bbc0c; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_a5d1c41a29ff1027763a9bbc0c" ON public.admin_tokens USING btree (is_active, expires_at);


--
-- Name: IDX_a60d70d105b562c7bff6b3c25c; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_a60d70d105b562c7bff6b3c25c" ON public.submission_history USING btree (user_id, created_at);


--
-- Name: IDX_ace513fa30d485cfd25c11a9e4; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON public.users USING btree (role);


--
-- Name: IDX_b5c4e2f5d600cd07185897ce7c; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_b5c4e2f5d600cd07185897ce7c" ON public.submission_history USING btree (submission_id, created_at);


--
-- Name: IDX_c8639b7626fa94ba8265628f21; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE UNIQUE INDEX "IDX_c8639b7626fa94ba8265628f21" ON public.settings USING btree (key);


--
-- Name: IDX_d962ccfdb1034078a122f8d850; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_d962ccfdb1034078a122f8d850" ON public.users USING btree (bitrix_user_id);


--
-- Name: IDX_deac577b3b227e5e67aa53b7e1; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_deac577b3b227e5e67aa53b7e1" ON public.form_fields USING btree (type);


--
-- Name: IDX_e2000d5e63746c4f2a03fdc76e; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_e2000d5e63746c4f2a03fdc76e" ON public.submissions USING btree (year_created, month_of_year);


--
-- Name: IDX_e3ecc79dd6a4df4fdecf28bf64; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_e3ecc79dd6a4df4fdecf28bf64" ON public.submission_history USING btree (action_type, created_at);


--
-- Name: IDX_e837f893b6992b8b174df26c54; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_e837f893b6992b8b174df26c54" ON public.submissions USING btree (tags, status);


--
-- Name: IDX_e8f45bbc74594473ac8b015b78; Type: INDEX; Schema: public; Owner: beton_user
--

CREATE INDEX "IDX_e8f45bbc74594473ac8b015b78" ON public.submissions USING btree (assigned_to_name, status);


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
-- Name: submissions FK_3c092eb0379093a69b2f1310b5c; Type: FK CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT "FK_3c092eb0379093a69b2f1310b5c" FOREIGN KEY (assigned_to_id) REFERENCES public.users(id);


--
-- Name: admin_tokens FK_7284b9f135db6f9fe3e95f2554c; Type: FK CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.admin_tokens
    ADD CONSTRAINT "FK_7284b9f135db6f9fe3e95f2554c" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: submissions FK_82318f9579f8f3df8480d46990f; Type: FK CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT "FK_82318f9579f8f3df8480d46990f" FOREIGN KEY (form_id) REFERENCES public.forms(id);


--
-- Name: submissions FK_fca12c4ddd646dea4572c6815a9; Type: FK CONSTRAINT; Schema: public; Owner: beton_user
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT "FK_fca12c4ddd646dea4572c6815a9" FOREIGN KEY (user_id) REFERENCES public.users(id);


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

